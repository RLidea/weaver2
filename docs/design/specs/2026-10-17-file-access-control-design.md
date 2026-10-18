# 파일 접근 통제 — 주소를 아는 것이 권한이 되지 않게

- **날짜**: 2026-10-17
- **상태**: v2 — 적대 검토 반영, 메인테이너 승인(2026-10-17) · **구현 완료**(2026-10-18, 레인 `file-access` — 아래 §9 「구현하며 바뀐 것」)
- **참여**: 메인테이너(방향 결정: 「근본 수정, DB 구조는 깔끔하게」) · AI 어시스턴트(조사·설계) · 독립 크리틱 에이전트(적대 검토)
- **관련 문서**: [`handbook/06-uploads`](../../handbook/06-uploads.md) · [인증 상태 모델 재설계](./2026-10-17-auth-credential-model-design.md) (§4.0 토큰 검증 일원화가 **선행 조건**)

---

## 1. 배경

업로드 파일은 `uploads/YYYY/MM/<uuid>.<ext>` 에 저장되고 백엔드가 `/uploads` 를 **정적 경로로 공개**한다. 오늘 붙인 응답 헤더(sandbox CSP·nosniff·attachment)는 「받은 파일이 브라우저에서 스크립트로 돌지 않게」 하는 것이지, 「누가 받을 수 있는가」를 정하지 않는다. 지금은 **주소를 아는 사람이 곧 권한자**다.

## 2. 뿌리

### F1. 파일을 내주는 길이 권한을 모른다

정적 서빙은 파일 이름만 본다. 그래서 다음이 그대로 내려간다.

- 회원 전용 게시판 글의 첨부 — 주소가 한 번 새면(공유·로그·브라우저 기록) 누구나
- 신고로 가려진 파일(`hiddenAt`), 작성자가 지운 파일(`deletedAt`) — 행만 표시되고 실제 파일은 계속 공개
- S3 는 서명 URL(1시간)이라 조금 낫지만, 서명을 **누구에게 줄지** 판단하지 못하는 건 같다

### F2. 파일 기록이 게시판 전용이다

업로드 라이브러리(`libs/upload`)는 범용인데 파일 테이블은 `post_files` 이고 `postId` 를 직접 들고 있다. 프로필 이미지는 **행이 아예 없다**(`users.profileImagePath` 문자열뿐). 파생 프로젝트가 다른 곳(예: 문의 첨부)에 파일을 붙이려면 `post_files` 에 FK 를 덧대거나 문자열로 갈 수밖에 없다. 「이 파일을 누가 볼 수 있나」를 물을 곳이 구조상 없다.

### F3. 파일 API 도 소유 자원의 읽기 정책을 보지 않는다

- `GET /v1/upload/post/:postId` 는 `@Public` 인데 게시판 READ·글 상태를 보지 않는다(가린 파일도 걸러지지 않는다)
- `GET /v1/upload/:id`·`:id/file`·`:id/thumbnail` 은 로그인만 확인한다
- `POST /v1/upload?postId=`, `PATCH :id/link` 는 **그 글의 작성자인지** 보지 않는다 — 남의 글에 파일을 붙일 수 있다

### F4. 게시글 읽기 정책이 경로마다 다르게 구현돼 있다

파일 권한은 결국 「그 글을 읽을 수 있나」에 기대야 하는데, 그 판단부터 흩어져 있다.

- 글 상세·게시판별 목록은 `requirePermission(boardId, READ)` 를 부르지만, **`GET /posts`(boardId 없음)는 부르지 않는다** — 회원 전용 게시판 글이 전체 목록으로 샌다
- `isSecret` 은 「비로그인에게만 숨김」이다. 로그인한 사람은 누구나 남의 비밀글을 읽는다
- 비공개 상태(초안·가림·삭제)의 글은 작성자·관리자에게도 예외가 없다 — 이건 의도로 보이며 유지한다
- `Post.requiredPermission` 은 아무도 읽지 않는 죽은 컬럼이다

## 3. 목표 모델

원칙: **파일 기록은 파일만 안다. 「무엇에 붙었나」는 붙은 쪽이 안다. 「누가 보나」는 붙은 쪽의 읽기 정책이 정한다.**

이름 규칙은 지금 스키마를 따른다 — 테이블만 `@@map` snake_case, 컬럼은 `@map` 없이 camelCase.

```prisma
/// 저장소에 있는 객체 하나. 무엇에 붙었는지는 모른다.
model File {
  id           String    @id @default(uuid())   // post_files.id 를 그대로 잇는다 — 신고(targetType MEDIA)가 이 id 를 가리킨다
  storageKey   String    @unique                // uploads/YYYY/MM/<uuid>.<ext> — 밖으로 내보내지 않는다
  thumbnailKey String?   @unique
  originalName String
  mimeType     String
  size         Int
  uploadedById String?
  hiddenAt     DateTime?                         // 신고 처리로 가림
  deletedAt    DateTime?                         // 지움 — 보존 기간 뒤 저장소와 행을 물리 삭제
  createdAt    DateTime  @default(now())
  uploadedBy   User?     @relation("FileUploader", fields: [uploadedById], references: [id], onDelete: SetNull)

  postAttachment PostAttachment?
  profileOf      User?           @relation("ProfileImage")

  @@index([uploadedById])
  @@index([createdAt(sort: Desc), id])
  @@map("files")
}

/// 게시글 첨부. 파일 하나는 한 글에만 붙는다.
model PostAttachment {
  fileId    String   @id
  postId    String
  position  Int
  createdAt DateTime @default(now())
  file      File     @relation(fields: [fileId], references: [id], onDelete: Restrict)
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([postId, position])
  @@map("post_attachments")
}

model User {
  // profileImageUrl · profileImagePath 대신
  profileImageFileId String? @unique
  profileImage       File?   @relation("ProfileImage", fields: [profileImageFileId], references: [id], onDelete: Restrict)
}
```

**없어지는 것**: `post_files`, `users.profileImageUrl`, `users.profileImagePath`, `posts.requiredPermission`(죽은 컬럼).

### 선택한 것과 이유

- **붙은 쪽 FK 는 `files` 를 향해 `Restrict`.** 정리 작업은 「어디에도 안 붙은 파일」을 지우는데, 본체는 파생 프로젝트의 첨부 테이블(`inquiry_attachments` 등)을 모른다. `Cascade` 였다면 본체가 그 파일을 고아로 보고 지우는 순간 파생 프로젝트의 첨부 행까지 조용히 사라진다. `Restrict` 면 **DB 가 「아직 붙어 있다」를 거절로 알려 준다** — 정리 작업은 행을 하나씩 지우다가 FK 위반(23503)이 나면 붙은 것으로 보고 건너뛴다. 파생 프로젝트가 무엇을 빠뜨려도 데이터가 사라지지 않는다.
- **글 쪽은 `Cascade`.** 글이 지워지면 첨부 관계만 사라지고 파일은 고아가 되어 보존 기간 뒤 정리된다.
- **파일의 주인은 하나.** 붙이는 경로가 트랜잭션 안에서 파일 행을 잠그고(`SELECT … FOR UPDATE`) 「아무 데도 안 붙었고, 이 사람이 올렸다」를 확인한 뒤에만 붙인다. 그래서 규칙 판정(4.1)이 순서에 따라 달라질 일이 없다.
- **OAuth 외부 프로필 주소 컬럼은 두지 않는다.** 지금 OAuth 가입은 공급자 이미지를 저장하지 않는다(`CreateOAuthUserCommand` 가 무시) — 쓰는 길이 없는 컬럼은 만들지 않는다. 필요해지면 그 쓰기 경로와 함께 더한다.
- **`PostAttachment.position` 에 유일 제약을 걸지 않는다.** Prisma 는 DEFERRABLE 제약을 표현하지 못해 순서 바꾸기가 「지우고 다시 넣기」가 된다. 순서는 정렬용이고, 같은 값이면 `createdAt` 으로 깬다.

### DB 불변식 (CHECK)

```sql
-- files
CHECK (size >= 0)
CHECK ("storageKey" NOT LIKE '/%' AND "storageKey" NOT LIKE '%..%')   -- 저장 키가 경로 밖으로 나가지 못한다
-- post_attachments
CHECK (position >= 0)
```

## 4. 동작

### 4.1 파일 읽기 정책은 붙은 쪽이 낸다

```ts
/** 파생 프로젝트도 이 토큰으로 자기 첨부 규칙을 더한다 (AUTH_PROVIDER_EXTRAS 와 같은 모양). */
export const FILE_ACCESS_RULES = Symbol('FILE_ACCESS_RULES');

export interface FileAccessRule {
  /** 이 파일이 내 것이 아니면 null — 다음 규칙으로 */
  decide(fileId: string, viewer: Viewer): Promise<'public' | 'allow' | 'deny' | null>;
}
```

`FileAccessService.canRead(file, viewer)`:

1. `deletedAt` → 아무도 못 본다(관리자 포함 — 관리자는 관리 화면의 별도 경로)
2. `hiddenAt` → 관리자(`UPLOAD.READ`)만
3. 규칙들을 돈다 — 파일의 주인은 하나라(§3) null 이 아닌 답은 많아야 하나다. 둘 이상이면 **거절**하고 오류 로그(규칙 버그)
4. 아무 규칙도 자기 것이라 하지 않으면(어디에도 안 붙음) → 올린 사람만

`viewer` 는 인증 설계 §4.0 의 일원화된 검증을 거친 사용자다 — pre-auth 토큰·탈퇴·정지 사용자는 비로그인으로 들어온다.

본체가 두는 규칙 둘:

- **게시글 첨부**: `PostReadPolicy.canRead(viewer, post)` 에 그대로 맡긴다(4.3). 비회원도 읽을 수 있는 글이면 `public`.
- **프로필 이미지**: `public`.

### 4.2 파일을 내주는 길은 하나

- 정적 `/uploads` **를 없앤다.** 로컬 저장소 디렉터리는 그대로 두되 웹에 내걸지 않는다.
- `GET /v1/files/:id`, `GET /v1/files/:id/thumbnail` — `@Public`(선택적 인증) + 4.1 판정.
  - **로컬**: 통과하면 스트림으로 보낸다. 오늘 만든 `setUploadResponseHeaders`(sandbox CSP·nosniff·attachment)를 그대로 쓴다. `StorageProvider` 에 `read(key): Readable` 을 더한다(직접 만든 저장소 공급자가 있는 파생 프로젝트는 구현해야 한다 — §6).
  - **S3**: 통과하면 **60초짜리** 서명 URL 로 302. 응답 형식·처리 방식은 오늘처럼 서명에 고정한다.
  - 못 보는 파일은 **404**(403 이 아니라) — 존재 여부를 알려 주지 않는다.
- **캐시**: 권한·가림이 바뀌면 곧 반영돼야 한다(신고된 내용이 하루 동안 캐시에서 계속 나가면 안 된다).
  - S3 302: `private, no-store` — 리다이렉트가 캐시되면 60초 뒤 만료된 서명을 가리킨다
  - 로컬 200, `public` 판정: `public, max-age=300` + `ETag` — **가림·삭제가 최대 5분 늦게 반영되는 것을 받아들인다**
  - 로컬 200, 그 밖: `private, no-cache` + `ETag` — 매번 권한을 다시 묻되 본문은 304 로 아낀다
- DTO 의 `url`·`thumbnailUrl` 은 백엔드가 `${FILE_URL_BASE}/v1/files/:id` 로 만든다. `FILE_URL_BASE` 기본값은 `/api`(Next 리라이트) — 파생 프로젝트가 API 를 직접 부르면 바꾼다. 같은 출처라 쿠키가 따라가고, `<img src>`·`<a href>` 가 그대로 동작한다.
- 프런트 `proxy.ts` 의 `/uploads` 공개 경로와 `next.config` 의 `/uploads` 리라이트를 지운다.
- **알고 가는 한계**: 액세스 토큰(15분)이 만료된 뒤의 `<img>` 요청은 비로그인으로 판정된다. 회원 전용 첨부는 404 가 되고, 브라우저는 이를 토큰 갱신 신호로 쓰지 못한다. 구현 때 `proxy.ts` 가 화면 이동 시 토큰을 갱신하는지 확인하고, 아니면 handbook 에 적는다.

### 4.3 게시글 읽기 정책도 한 곳으로 (F4)

`PostReadPolicy` 하나가 「이 사람이 이 글을 읽을 수 있나」를 답한다. 글 상세·목록(게시판 있음/없음)·댓글·첨부가 전부 이걸 쓴다.

- 글 상태: `PUBLISHED`, `deletedAt null`, `hiddenAt null` — 지금처럼 예외 없음
- 게시판 READ: 지금의 `PermissionService.hasResourcePermission`(거부 기본값·최고관리자 통과·거부 그룹)을 **그대로** 쓴다. 손으로 쓴 SQL 사본을 만들지 않는다
- 비밀글: 작성자와 관리자만 (§7)
- `GET /posts`(boardId 없음): 활성 게시판마다 같은 판정으로 READ 가능한 게시판 id 집합을 구해 `WHERE "boardId" IN (…)` — 글마다 권한을 묻지 않는다(게시판 수는 작다)

### 4.4 쓰기도 붙는 쪽이 판정 (F3)

- 업로드는 붙을 곳 없이 한다(`POST /v1/files`). `?postId=` 를 없앤다.
- 글 생성·수정 요청이 `attachmentFileIds`(순서대로)를 받는다. **글 작성자이고, 각 파일을 그 사람이 올렸고, 아무 데도 안 붙었을 때**만 붙인다(§3 의 잠금).
- 수정에서 목록에서 빠진 파일은 관계만 지워 고아로 만든다 — 보존 기간 뒤 정리된다(즉시 지우지 않아 「실수로 뺐다 다시 넣기」가 된다).
- **프로필 이미지 지정**: 그 사람이 올렸고, 아무 데도 안 붙었고, 인라인 이미지 형식일 때만. 이전 프로필 파일은 관계를 끊고 `deletedAt` 을 찍는다.

### 4.5 지운 파일은 실제로 지운다

정리 스케줄러가 「어디에도 안 붙은 채 보존 기간이 지난 파일」과 「`deletedAt` 이 보존 기간을 넘긴 파일」을 지운다. 순서는 **행 먼저**(FK 위반이면 건너뜀), 성공하면 저장소 객체. 지금은 soft delete 된 파일이 디스크·S3 에 영원히 남는다.

신고 처리(`moderation.service`·`hide-post-file.command`)는 `files` 를 본다.

## 5. 데이터 이전

**이름 바꾸기는 손으로 쓴다**(`post_files` → `files`, `path` → `"storageKey"`): Prisma 가 만든 SQL 은 DROP + ADD 로 데이터를 지운다.

1. `files` ← `post_files`: **id 그대로**(신고가 가리킨다), 지운 파일은 `deletedAt` 그대로, `path` → `"storageKey"`
2. `post_attachments` ← `post_files."postId"` 가 있고 지우지 않은 행(`position` 은 `"createdAt"` 순)
3. **프로필 이미지**: 이 파일들은 행이 없었다. 형식은 확장자로 알 수 있지만(검증된 형식에서 정해진다) **크기는 저장소에 물어야 한다** — SQL 로는 못 한다. 그래서:
   - 배포 **전에** `pnpm files:prepare-profile-import` 를 **옛 스키마에서** 돌린다. 저장소에서 크기를 읽어 임시 테이블 `_profile_image_import("userId", size)` 에 쓴다.
   - 마이그레이션은 그 테이블로 `files` 행을 만들고 `"profileImageFileId"` 를 연결한 뒤 임시 테이블을 지운다. **경로가 있는 사용자 중 임시 행이 없는 사람이 있으면 멈춘다.**
   - 프로필 이미지가 없는 프로젝트는 스크립트 없이 그냥 지나간다.
   - `prisma migrate deploy` 는 대기 중인 마이그레이션을 한 번에 다 돌리므로 「마이그레이션 두 개 사이에 스크립트」는 성립하지 않는다 — 그래서 스크립트가 앞에 선다.
4. 옛 테이블·컬럼 삭제. 저장 파일은 **옮기지 않는다**(키가 같다)

**배포 순서**(handbook 런북): 백업 → 준비 스크립트 → `db:deploy` → 재시작. 멈췄으면 `prisma migrate resolve --rolled-back` → 원인 해결 → 다시.

## 6. API 영향

| 바뀌는 것 | 하위 영향 |
|---|---|
| `/uploads/*` 정적 경로 사라짐 → `/v1/files/:id` | 외부에 붙여 둔 옛 주소는 깨진다(본체는 글 본문이 평문이라 해당 없음) |
| `/v1/upload*` → `/v1/files*`, `?postId=`·`PATCH link/unlink` 없음 | `packages/api-client` 스키마, 게시판 글쓰기(업로드 → 글 저장 시 id 전달) |
| `GET /v1/upload/post/:postId` → 글 응답에 `attachments` 포함 | 첨부 목록 훅 |
| `StorageProvider.read(key)` 추가 | 직접 만든 저장소 공급자 |
| `FILE_URL_BASE` 추가(기본 `/api`) | API 를 직접 부르는 파생 프로젝트 |
| 사용자 DTO 의 `profileImageUrl` 은 유지(계산값) | 화면 변경 없음 |

## 7. 결정한 것

- **비밀글은 작성자와 관리자만 읽는다** (메인테이너, 2026-10-17). 지금의 「비로그인에게만 숨김」은 「회원 전용」과 구별되지 않는다. 「관리자」는 그 게시판의 관리 권한(`ResourcePermission` 의 관리 동작) 또는 최고관리자다 — 구현 때 지금 권한 동작 목록에서 정확한 이름을 고른다. 목록에서는 지금처럼 제목만 보이고 내용·첨부는 막을지, 아예 숨길지는 지금 목록 동작을 따른다. 첨부 판정이 이 답을 그대로 따른다.

## 8. 작업 순서

격리 레인 하나. **인증 레인이 먼저 착륙**한 뒤 rebase 하고 `db:generate`(둘 다 `users` 를 건드리고, 4.1 이 인증 §4.0 에 기댄다).

1. 스키마·마이그레이션·CHECK + 프로필 이미지 준비 스크립트
2. `PostReadPolicy` — 상세·목록·전체 목록·댓글을 한 정책으로(F4 의 누수 포함)
3. `FileAccessService` + 규칙 + `/v1/files` 서빙 + `StorageProvider.read`, 정적 `/uploads` 제거
4. 붙이기를 글 API 로, 프로필 지정 규칙, 물리 정리(FK 위반 건너뛰기), 신고 처리 이전
5. 프런트(게시판 글쓰기·첨부·프로필)
6. 통합 테스트(실제 DB): 회원 전용 글 첨부를 비회원이 받으면 404, 가린 파일 404, 남의 글에 붙이기 거절, 같은 파일 두 곳에 붙이기 거절, 「파생 첨부 테이블」을 흉내 낸 테이블에 붙은 파일을 정리가 건너뜀, `GET /posts` 가 회원 전용 게시판 글을 비회원에게 안 줌. **데이터를 채운 DB 로 마이그레이션**
7. e2e: `upload-headers` → 권한별 접근과 캐시 헤더
8. handbook 06-uploads(런북, 「내 첨부 테이블 더하기」 — `Restrict` FK·규칙 등록·붙이기 잠금)

## 9. 구현하며 바뀐 것과 남은 메모 (2026-10-18)

**바뀐 것**
- **규칙 등록은 토큰이 아니라 등록부(`FileAccessRuleRegistry`)** — Nest 는 한 토큰에 공급자가 하나뿐이라 본체(게시글·프로필)와 파생이 함께 규칙을 낼 수 없다. 각 모듈이 `onModuleInit` 에서 `register`
- **마이그레이션은 확장 → 축소 둘** — 한 마이그레이션에서 옛 표까지 지우면 중간 커밋이 깨진다. 착륙은 한꺼번에(인증 재설계와 같은 방식)
- **`files.detachedAt` 추가** — 떼어진 파일의 보존 기간을 뗀 때부터 잰다(올린 때부터 재면 오래전 파일을 빼는 즉시 정리돼 「실수로 뺐다 다시 넣기」가 안 된다). 보안 리뷰에서 나옴
- **준비 스크립트가 크기와 함께 형식(`mimeType`)도 쓴다** — 확장자로 표에서 찾고, 모르는 확장자면 멈춘다
- **붙이기 잠금은 두 문장** — 잠금과 「붙었나」 확인을 한 문장에 두면 READ COMMITTED 에서 스냅샷이 잠금 전에 잡혀 같은 파일이 두 곳에 붙었다(통합 시험이 잡음)
- **가린 파일은 새로 붙이지 않고, 가린 첨부는 수정 목록에 없어도 떼지 않는다** — 신고 처리 증거가 수정 한 번에 정리되지 않게
- **프로필 지정은 업로드와 한 엔드포인트** — 「올리고 곧바로 지정」. 지정 규칙(내가 올림·안 붙음·인라인 이미지)은 같은 잠금으로 지킨다
- **검색도 `PostReadPolicy` 로** — §4.3 표에는 없었지만 같은 F4 누수(회원 전용 글 본문이 검색됨, 댓글 검색은 지운·가린 댓글까지)
- **`Content-Length` 를 걸지 않는다** — DB 의 size 와 저장된 바이트가 어긋나면 keep-alive 다음 응답이 깨졌다(e2e 가 잡음)

**남은 메모 — 조사하지 않고 적어 둔다** (설계 범위 밖이거나 영향이 작다)
- 리액션 API(`GET/POST /posts/:id/reactions`)가 글 읽기 권한을 보지 않는다 — 회원 전용·비밀글의 리액션 수가 보이고 리액션을 달 수 있다. `findReadablePost` 한 줄이면 된다
- 깨진 이미지를 올리면 썸네일(sharp) 단계에서 500 이 나고 원본 객체가 저장소에 남는다
- `listWhere` 는 게시판마다 권한을 서너 번 묻는다 — 게시판이 수백 개면 규칙을 한 번에 읽어 메모리에서 판정하게 바꾼다
- 탈퇴는 막지만 정지된 사람의 프로필 이미지는 그대로 공개다(정책 결정)

