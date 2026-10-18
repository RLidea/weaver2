-- 파일 접근 통제 — 확장 단계 (docs/design/specs/2026-10-17-file-access-control-design.md §3·§5).
-- 파일 기록(files)을 게시판에서 떼어 내고, 게시글 첨부(post_attachments)와 프로필 이미지
-- (users.profileImageFileId)가 그것을 가리키게 한다.
-- 옛 post_files · users.profileImageUrl/profileImagePath · posts.requiredPermission 은 아직 지우지 않는다 —
-- 서비스가 새 테이블로 다 옮겨 간 뒤 축소 마이그레이션이 지운다.
-- 저장된 파일은 옮기지 않는다(저장 키가 같다).

-- 0. 저장 키가 저장소 밖을 가리키면 멈춘다. 아래 CHECK 가 막을 값이라 옮기기 전에 사람이 본다.
--    확인: SELECT id, path FROM post_files WHERE path LIKE '/%' OR path LIKE '%..%' OR "thumbnailPath" LIKE '/%' OR "thumbnailPath" LIKE '%..%';
DO $$
DECLARE
  bad text;
BEGIN
  SELECT string_agg(id, ', ')
    INTO bad
    FROM post_files
   WHERE path LIKE '/%' OR path LIKE '%..%'
      OR "thumbnailPath" LIKE '/%' OR "thumbnailPath" LIKE '%..%';

  IF bad IS NOT NULL THEN
    RAISE EXCEPTION
      'file_access_expand: 저장소 밖을 가리키는 post_files 경로가 있습니다: %', bad;
  END IF;
END $$;

-- 1. 새 테이블
ALTER TABLE "users" ADD COLUMN "profileImageFileId" TEXT;

CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "hiddenAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "detachedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "post_attachments" (
    "fileId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_attachments_pkey" PRIMARY KEY ("fileId")
);

CREATE UNIQUE INDEX "files_storageKey_key" ON "files"("storageKey");
CREATE UNIQUE INDEX "files_thumbnailKey_key" ON "files"("thumbnailKey");
CREATE INDEX "files_uploadedById_idx" ON "files"("uploadedById");
CREATE INDEX "file_cursor_idx" ON "files"("createdAt" DESC, "id");
CREATE INDEX "post_attachments_postId_position_idx" ON "post_attachments"("postId", "position");
CREATE UNIQUE INDEX "users_profileImageFileId_key" ON "users"("profileImageFileId");

-- 붙은 쪽 → files 는 Restrict: 정리 작업이 「아직 붙은 파일」을 FK 위반으로 알아챈다(§3)
ALTER TABLE "users" ADD CONSTRAINT "users_profileImageFileId_fkey" FOREIGN KEY ("profileImageFileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. 불변식
ALTER TABLE "files" ADD CONSTRAINT "files_size_check" CHECK ("size" >= 0);
ALTER TABLE "files" ADD CONSTRAINT "files_storage_key_check"
  CHECK ("storageKey" NOT LIKE '/%' AND "storageKey" NOT LIKE '%..%');
ALTER TABLE "files" ADD CONSTRAINT "files_thumbnail_key_check"
  CHECK ("thumbnailKey" IS NULL OR ("thumbnailKey" NOT LIKE '/%' AND "thumbnailKey" NOT LIKE '%..%'));
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_position_check" CHECK ("position" >= 0);

-- 3. files ← post_files — id 그대로(신고 targetType MEDIA 가 가리킨다), 지운 파일은 deletedAt 그대로
INSERT INTO "files" ("id", "storageKey", "thumbnailKey", "originalName", "mimeType", "size",
                     "uploadedById", "hiddenAt", "deletedAt", "createdAt")
SELECT id, path, "thumbnailPath", "originalName", "mimeType", size,
       "uploadedById", "hiddenAt", "deletedAt", "createdAt"
  FROM post_files;

-- 4. post_attachments ← 글에 붙어 있고 지우지 않은 파일. 순서는 올린 순
INSERT INTO "post_attachments" ("fileId", "postId", "position", "createdAt")
SELECT id, "postId",
       (row_number() OVER (PARTITION BY "postId" ORDER BY "createdAt", id) - 1)::int,
       "createdAt"
  FROM post_files
 WHERE "postId" IS NOT NULL AND "deletedAt" IS NULL;

-- 5. 프로필 이미지 — 이 파일들은 행이 없었다. 크기는 저장소에 물어야 해서 SQL 로는 못 한다.
--    배포 전에 옛 스키마에서 `pnpm files:prepare-profile-import` 를 돌려
--    _profile_image_import("userId", size, "mimeType") 을 채워 둔다. 프로필 이미지가 없으면 그냥 지나간다.
--    확인: SELECT count(*) FROM users WHERE "profileImagePath" IS NOT NULL;
DO $$
DECLARE
  missing text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE "profileImagePath" IS NOT NULL) THEN
    DROP TABLE IF EXISTS "_profile_image_import";
    RETURN;
  END IF;

  IF to_regclass('"_profile_image_import"') IS NULL THEN
    RAISE EXCEPTION
      'file_access_expand: 프로필 이미지가 있는데 _profile_image_import 가 없습니다 — pnpm files:prepare-profile-import 를 먼저 돌리세요';
  END IF;

  SELECT string_agg(u.id, ', ')
    INTO missing
    FROM users u
    LEFT JOIN "_profile_image_import" i ON i."userId" = u.id
   WHERE u."profileImagePath" IS NOT NULL AND i."userId" IS NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'file_access_expand: 크기를 모르는 프로필 이미지가 있습니다 — 준비 스크립트를 다시 돌리세요: %', missing;
  END IF;

  -- 새 행의 id 는 여기서 만들고, 사용자와 잇는 데는 저장 키(유일)를 쓴다
  INSERT INTO "files" ("id", "storageKey", "originalName", "mimeType", "size", "uploadedById", "createdAt")
  SELECT gen_random_uuid()::text, u."profileImagePath",
         regexp_replace(u."profileImagePath", '^.*/', ''),
         i."mimeType", i.size, u.id, u."updatedAt"
    FROM users u
    JOIN "_profile_image_import" i ON i."userId" = u.id
   WHERE u."profileImagePath" IS NOT NULL;

  UPDATE users u SET "profileImageFileId" = f.id
    FROM "files" f
   WHERE f."storageKey" = u."profileImagePath";

  DROP TABLE "_profile_image_import";
END $$;
