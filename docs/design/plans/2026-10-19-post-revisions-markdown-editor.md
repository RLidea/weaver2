# 글 판 기록 · 마크다운 편집기 · 관리 메뉴 자리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 파생 프로젝트가 「저장할 때마다 판을 남기고 두 판을 비교하는」 글쓰기 화면을 weaver2 부품만으로 조립할 수 있게 한다. 세 조각이다.

- **W1** 게시판마다 켜고 끄는 글 판 기록(`PostRevision`)과 판 비교 컴포넌트(`RevisionDiff`)
- **W2** 렌더러를 주입받는 마크다운 편집기(`MarkdownEditor`) — weaver2 는 마크다운 의존성을 지지 않는다
- **W3** 파생 프로젝트가 관리 메뉴를 더하는 자리(`admin-nav.extra.ts`)

**Architecture:** 판 기록은 board 피처 안의 서비스 하나(`PostRevisionService`)가 맡는다. 쓰기는 호출자의 트랜잭션 클라이언트(`tx`)를 받아 글 쓰기와 한 덩어리로 묶이고, 게시판의 `keepRevisions` 가 꺼져 있으면 아무것도 쓰지 않는다. `PostService` 의 글 쓰기 · 고치기가 이것을 부르고, 파생 프로젝트의 자체 쓰기 경로(게시판 권한 판정을 거치지 않는 서비스)도 같은 메서드를 부른다. 조회는 관리자 경로 둘이다. 프런트 부품 둘은 `packages/ui` 에, 메뉴 자리는 앱의 레이아웃 폴더에 둔다.

**Tech Stack:** Prisma 7(멀티 파일 스키마) · NestJS · jest(단위 · 통합) · React 19 · Tailwind 4 토큰 · `diff`(jsdiff, `packages/ui` 의 새 의존성 하나).

## Global Constraints

- 커밋 메시지: 한국어, AI 생성 표시 금지 (`CONTRIBUTING.md`). `--no-verify` 금지
- 스키마를 바꾸므로 **격리 레인**(`pnpm lane:new blog-parts --isolated`)에서 한다. 마이그레이션은 그 레인 DB 에만 적용한다
- 레인에서 `pnpm lint` 금지 — `pnpm lint:check`
- 일반 부품이다. 블로그 · 특정 파생 프로젝트의 이름이나 가정을 넣지 않는다
- **계약**(아래 표)의 이름 · 경로 · props 는 파생 프로젝트가 기댄다. 바꾸려면 파생 쪽 계획과 함께 바꾼다
- `pnpm openapi:types` 산출물(`packages/api-client/src/types/api-schema.d.ts`)은 커밋한다 — CI 가 최신인지 검사한다

## 계약 (파생 프로젝트가 기대는 것)

| 조각 | 계약 |
|---|---|
| 스키마 | `Board.keepRevisions Boolean @default(false)` · `PostRevision { id, postId, title, content, actorUserId?, actorKind, createdAt }` (`post_revisions`) |
| 서비스 | `PostRevisionService.record(tx, { postId, title, content, actor })` — 그 글의 게시판이 `keepRevisions` 일 때만 쓴다. `actor = { userId: string \| null, kind: 'SESSION' \| 'TOKEN' }`. 반환은 만든 판, 안 썼으면 `null` |
| 서비스 | `PostService.createPost` · `updatePost` 가 같은 `record` 를 부른다 |
| API | `GET /v1/admin/posts/:postId/revisions` — 판 목록(본문 없음, 최신 순) · `GET /v1/admin/posts/:postId/revisions/:revisionId` — 판 전문. 둘 다 `PERMISSIONS.POST.READ_ALL` (기존 `GET /v1/admin/posts` 와 같은 권한) |
| API | `PATCH /v1/boards/:id` 가 `keepRevisions` 를 받고, 게시판 응답에 실린다. 새 게시판은 꺼진 채 만들어진다 |
| UI | `RevisionDiff({ before, after, className? })` — 줄 단위 비교, 추가 · 삭제를 색과 기호(`+` · `-`)로 함께 |
| UI | `MarkdownEditor({ value, onChange, renderPreview: (md) => Promise<string>, previewClassName?, className?, placeholder? })` |
| 메뉴 | `apps/core-frontend/src/shared/components/layout/admin-nav.extra.ts` 의 `ADMIN_NAV_EXTRA: AdminNavItem[]` (weaver2 는 빈 배열) |

### 정한 것

- **판은 「저장한 뒤의 모습」이다.** 글을 만들 때 첫 판, 고칠 때마다 다음 판. 그래서 두 판을 고르면 그 사이의 변화가 나온다. 게시판을 켜기 **전**에 있던 글은 첫 수정 때 첫 판이 생긴다(켜기 전의 모습은 없다)
- **제목 · 본문이 직전 판과 같으면 쓰지 않는다.** 상태 · 고정 · 첨부만 바꾼 저장이 판을 늘리지 않게 한다. 이 판정은 `record` 가 한다 — 호출자마다 비교를 되풀이하지 않게. 단, 게시판을 켠 뒤 **첫 저장은 상태만 바꾼 것이어도 기준 판을 하나 남긴다**(비교할 직전 판이 없다)
- **`record` 의 호출자는 같은 트랜잭션에서 그 글 행을 먼저 고쳤거나 잠가야 한다.** 그래야 같은 글을 동시에 저장하는 두 요청이 「직전 판」을 엇갈려 읽지 않는다
- **판 목록은 최신 200개까지.** `createdAt` 은 쓰는 쪽이 `new Date()` 로 박아, 순서가 넣은 때를 따른다
- **`actorKind` 는 Prisma enum `PostRevisionActorKind { SESSION TOKEN }`.** 저장소의 enum 은 모두 대문자다. `TOKEN` 은 범위 토큰(뒤 단계)이 쓸 자리로 미리 둔다
- **지운 사람 · 지운 글:** `actorUserId` 는 `onDelete: SetNull`(누가 썼는지는 잃어도 판은 남는다), `postId` 는 `onDelete: Cascade`(글을 영구 삭제하면 판도 — 내용 정리 스케줄러가 `post.deleteMany` 를 그대로 쓸 수 있게)
- **관리 조회는 소프트 삭제 · 숨김 글도 본다.** 관리자 글 목록(`includeDeleted`)과 같은 태도다. 글 행 자체가 없으면 404, 판이 그 글의 것이 아니면 404
- **판 목록은 쪽 나누기를 하지 않는다.** 한 글의 판은 수십 개 단위다. 200개 상한을 넘기는 글이 생기면 그때 keyset 으로 바꾼다
- **diff 는 `diff`(jsdiff) 의 `diffLines` 를 쓴다.** 줄 번호 붙이기만 우리가 한다(`packages/ui/src/lib/line-diff.ts`). LCS 를 손으로 짜지 않는다
- **`MarkdownEditor` 는 소독하지 않는다.** `renderPreview` 가 돌려준 HTML 을 그대로 꽂는다. 소독은 주입하는 쪽의 책임이고, 공개 화면과 같은 함수를 넣어야 미리보기와 공개 화면이 같은 소독을 거친다
- **관리 메뉴 자리는 `feat/module-registry` 를 따르지 않는다.** 그 가지의 슬롯 시스템은 대시보드 슬롯(`dashboard-top` · `global-popup`)만 다루고 관리 사이드바는 여전히 고정 배열이다. 게다가 `dev` 보다 194 커밋 뒤에 있다. 여기서는 가장 작은 정적 파일 하나로 자리를 연다

---

### Task 1: 스키마 · 마이그레이션

**Files:**
- Modify: `apps/core-backend/prisma/schema/board.prisma` (`Board.keepRevisions`, `Post.revisions`, `PostRevision`, `PostRevisionActorKind`)
- Modify: `apps/core-backend/prisma/schema/auth.prisma` (`User.postRevisions` 역관계)
- Create: `apps/core-backend/prisma/schema/migrations/<ts>_add_post_revisions/migration.sql`

```prisma
model PostRevision {
  id          String                @id @default(uuid())
  postId      String
  title       String
  content     String
  actorUserId String?
  actorKind   PostRevisionActorKind @default(SESSION)
  createdAt   DateTime              @default(now())
  post        Post                  @relation(fields: [postId], references: [id], onDelete: Cascade)
  actorUser   User?                 @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([postId, createdAt(sort: Desc)], map: "post_revision_post_idx")
  @@map("post_revisions")
}
```

- [ ] `prisma migrate dev --create-only --name add_post_revisions` 로 SQL 을 만들고 읽어 본다 (테이블 · enum · FK 둘 · 인덱스 · `boards.keepRevisions` 열 하나만 있어야 한다)
- [ ] 레인 DB 에 `pnpm db:deploy` · `pnpm db:generate`
- [ ] Commit

### Task 2: `PostRevisionService` (TDD, 단위)

**Files:**
- Create: `apps/core-backend/src/features/board/services/post-revision.service.ts` · `.spec.ts`
- Create: `apps/core-backend/src/features/board/repositories/create-post-revision.command.ts` · `find-latest-post-revision.query.ts` · `find-post-revisions.query.ts` · `find-post-revision-by-id.query.ts`
- Create: `apps/core-backend/src/features/board/dto/post-revision.dto.ts` (`PostRevisionSummaryDto` · `PostRevisionDto`)
- Modify: `apps/core-backend/src/features/board/board.module.ts` (provider · export)

**Interfaces:**
- `record(tx: Prisma.TransactionClient, input: { postId; title; content; actor: PostRevisionActor }): Promise<PostRevision | null>`
- `findByPostId(postId): Promise<PostRevisionSummaryDto[]>` — 글 행이 없으면 404
- `findOne(postId, revisionId): Promise<PostRevisionDto>` — 없거나 다른 글의 판이면 404

시험(먼저 쓰고 빨강을 본다):
- [ ] 게시판이 꺼져 있으면 쓰지 않고 `null`
- [ ] 켜져 있고 판이 없으면 쓴다 — 넘긴 `tx` 로 (같은 트랜잭션)
- [ ] 직전 판과 제목 · 본문이 같으면 쓰지 않는다
- [ ] 제목만 · 본문만 달라도 쓴다
- [ ] 글이 없으면 `null` (호출자의 트랜잭션을 깨지 않는다 — 글 존재는 호출자가 이미 판정했다)

### Task 3: `PostService` 가 판을 남긴다 (TDD, 단위)

**Files:**
- Modify: `apps/core-backend/src/features/board/services/post.service.ts` (생성자에 `PostRevisionService`, `createPost` · `updatePost` 트랜잭션 안에서 `record`)
- Create: `apps/core-backend/src/features/board/services/post.service.spec.ts`

- [ ] `updatePost` 는 고친 뒤의 제목 · 본문으로 `record` 를 부른다 — 같은 `tx`, actor 는 `{ userId: editor.id, kind: 'SESSION' }`
- [ ] `createPost` 는 만든 글로 `record` 를 부른다. 익명 작성이면 `userId: null`
- [ ] `record` 가 던지면 고치기도 실패한다(트랜잭션 한 덩어리)

### Task 4: 게시판 토글 (`keepRevisions`)

**Files:**
- Modify: `dto/board.dto.ts` · `dto/update-board.dto.ts` · `repositories/update-board.command.ts` · `repositories/update-post.command.ts`(응답의 `board` select 에 칸 추가)
- 만들기(`POST /v1/boards`)는 건드리지 않는다 — 켜기는 수정 한 길로 충분하고, 생성 명령의 인자가 늘면 시험까지 번진다
- Modify: 프런트 `features/admin/boards/types.ts` · `components/board-edit-modal.tsx` (체크박스 「저장할 때마다 판 남기기」)

### Task 5: 관리 조회 경로 (TDD, 통합)

**Files:**
- Modify: `apps/core-backend/src/features/board/controllers/post-admin.controller.ts`
- Create: `apps/core-backend/test/integration/post-revisions.integration.spec.ts`

시험:
- [ ] 켠 게시판의 글을 `POST` 로 만들고 `PATCH` 두 번(제목만 · 본문만) → 판 셋, 최신 순, 목록에 `content` 없음
- [ ] 상태만 바꾼 `PATCH` 는 판을 늘리지 않는다
- [ ] 끈 게시판의 글은 고쳐도 판 0
- [ ] 전문 경로는 `content` 를 준다. 다른 글의 판 id 면 404, 없는 글이면 404
- [ ] 관리 권한 없는 회원은 두 경로 모두 403 (`route-guard-coverage` 도 자동으로 덮는다)

### Task 6: `RevisionDiff` (TDD, 단위 — 순수 함수만)

**Files:**
- Modify: `packages/ui/package.json` (`diff`)
- Create: `packages/ui/src/lib/line-diff.ts` · `line-diff.spec.ts`
- Create: `packages/ui/src/components/revision-diff.tsx` · `revision-diff.stories.tsx`
- Modify: `packages/ui/src/index.ts` · `apps/core-backend/jest.config.js` (`roots` 에 `packages/ui/src` — `api-client` 처럼)

`diffByLine(before, after): DiffLine[]` — `{ kind: 'added' | 'removed' | 'unchanged', text, oldNumber, newNumber }`

시험:
- [ ] 같으면 모두 `unchanged`, 줄 번호가 양쪽에 붙는다
- [ ] 가운데 한 줄을 바꾸면 `removed` 다음 `added`, 앞뒤 줄 번호가 어긋나지 않는다
- [ ] 끝 줄바꿈 유무만 다르면 내용 줄이 바뀐 것으로 나오지 않는다
- [ ] 빈 문자열 ↔ 여러 줄

컴포넌트는 표(`<table>`)로 그린다: 옛 줄 번호 · 새 줄 번호 · 기호 · 본문. 추가는 `bg-success/10`, 삭제는 `bg-error/10`, 기호는 색만으로 구분하지 않게 늘 보인다. 화면 읽기 프로그램을 위해 기호 칸에 `aria-label`(「추가」 · 「삭제」).

### Task 7: `MarkdownEditor`

**Files:**
- Create: `packages/ui/src/components/markdown-editor.tsx` · `markdown-editor.stories.tsx`
- Modify: `packages/ui/src/index.ts`

- md 이상: 입력 · 미리보기를 나란히(`md:grid-cols-2`). 그 아래: `Tabs`(입력 · 미리보기)로 하나만 보인다
- 미리보기는 마지막 입력 뒤 300ms 에 `renderPreview` 를 부른다. 늦게 온 옛 결과가 새 결과를 덮지 않게 요청마다 표를 붙인다. 실패하면 미리보기 자리에 오류 문구
- 결과 HTML 은 `dangerouslySetInnerHTML` 로 꽂는다 — 소독은 `renderPreview` 의 책임(주석으로 못 박는다)
- 프런트 단위 시험 도구가 없다 — 검증은 typecheck · lint · 스토리

### Task 8: 관리 메뉴 자리

**Files:**
- Create: `apps/core-frontend/src/shared/components/layout/admin-nav.extra.ts`
- Modify: `apps/core-frontend/src/shared/components/layout/admin-sidebar.tsx` (`AdminNavItem` 타입 export, 고정 배열 뒤에 이어 붙임 — 권한 판정은 그대로 `hasPermission`)

### Task 9: OpenAPI 타입 · 검증

- [ ] `pnpm openapi:types` → `api-schema.d.ts` 커밋
- [ ] `pnpm typecheck` · `pnpm lint:check` · `pnpm test:core`
- [ ] `pnpm --filter @weaver2/ui lint` 는 이 레인과 무관하게 **지금 실패한다** — 기존 `search-input.tsx:42` 의 `react-hooks/set-state-in-effect`. 이 레인이 더한 파일만 `npx eslint <파일>` 로 깨끗한지 본다
- [ ] `pnpm test:integration:run -- post-revisions route-guard-coverage admin-privilege post-read-policy` (레인 DB)

## 파생 프로젝트가 upstream 을 merge 할 때

- 마이그레이션 하나(`add_post_revisions`)가 들어온다. `pnpm db:deploy` · `pnpm db:generate`
- `User` · `Post` 모델에 역관계(`postRevisions` · `revisions`)가 생긴다. 파생 쪽이 같은 모델에 역관계를 더했다면 그 줄 근처에서 충돌이 날 수 있다 — 둘 다 남기면 된다
- `admin-nav.extra.ts` 는 weaver2 가 빈 배열로만 배포한다. 파생 쪽이 채우고 나면 이후 upstream 은 이 파일을 건드리지 않는다
- `PostService` 생성자에 인자가 하나 늘었다. 파생 쪽에서 `new PostService(...)` 를 직접 부르는 시험이 있으면 고친다
