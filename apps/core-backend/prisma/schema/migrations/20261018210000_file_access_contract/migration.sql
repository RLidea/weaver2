-- 파일 접근 통제 — 축소 단계 (docs/design/specs/2026-10-17-file-access-control-design.md §3·§5-4).
-- 서비스가 files · post_attachments · users.profileImageFileId 로 다 옮겨 간 뒤 옛 자리를 지운다.
-- 저장된 파일은 그대로다(저장 키가 같다).

-- 0. 옮기지 못한 것이 있으면 멈춘다 — 지우고 나면 되돌릴 데이터가 없다.
--    확인: SELECT id FROM post_files p WHERE NOT EXISTS (SELECT 1 FROM files f WHERE f.id = p.id);
--          SELECT id FROM users WHERE "profileImagePath" IS NOT NULL AND "profileImageFileId" IS NULL;
DO $$
DECLARE
  lost_files text;
  lost_profiles text;
BEGIN
  SELECT string_agg(p.id, ', ')
    INTO lost_files
    FROM post_files p
   WHERE NOT EXISTS (SELECT 1 FROM files f WHERE f.id = p.id);

  IF lost_files IS NOT NULL THEN
    RAISE EXCEPTION
      'file_access_contract: files 로 옮겨지지 않은 post_files 가 있습니다: %', lost_files;
  END IF;

  SELECT string_agg(id, ', ')
    INTO lost_profiles
    FROM users
   WHERE "profileImagePath" IS NOT NULL AND "profileImageFileId" IS NULL;

  IF lost_profiles IS NOT NULL THEN
    RAISE EXCEPTION
      'file_access_contract: files 로 옮겨지지 않은 프로필 이미지가 있습니다: %', lost_profiles;
  END IF;
END $$;

-- 1. 게시판 전용 파일 표 — files · post_attachments 가 잇는다
ALTER TABLE "post_files" DROP CONSTRAINT "post_files_postId_fkey";
ALTER TABLE "post_files" DROP CONSTRAINT "post_files_uploadedById_fkey";
DROP TABLE "post_files";

-- 2. 프로필 이미지 주소·경로 — 주소는 /v1/files/:id 로 만들고, 경로는 files.storageKey 에 있다
ALTER TABLE "users" DROP COLUMN "profileImagePath",
DROP COLUMN "profileImageUrl";

-- 3. 아무도 읽지 않던 컬럼 (게시판 READ 는 ResourcePermission 이 정한다)
ALTER TABLE "posts" DROP COLUMN "requiredPermission";
