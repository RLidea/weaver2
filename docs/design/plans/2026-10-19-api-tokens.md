# 범위가 있는 API 토큰 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사람이 아닌 호출자(스크립트 · 다른 에이전트)가 쿠키 세션 없이 **정해진 경로 몇 개만** 부를 수 있게 한다. 관리자가 사용자 한 명에게 묶인 토큰을 발급하고, 그 토큰은 파생 프로젝트가 `@ApiTokenScope('x')` 로 열어 둔 경로에서만 통한다. 주인의 권한은 `@RequirePermission` 을 결코 채우지 못한다 — 경로 자신의 범위만 그 자리에 선다.

**Architecture:** 토큰은 앱이 발급한다(따로 있는 accounts SSO 가 아니다). 저장은 `ApiToken` 한 행 — 원문이 아니라 sha256 해시만 둔다. 인증은 이미 있는 전역 가드 `JwtAuthGuard` 의 **앞머리 한 갈래**다: `Authorization: Bearer` 에 API 토큰 모양이 실려 오면 토큰 갈래로, 아니면 지금 그대로 `JwtStrategy` 로 간다. 세션 쪽 코드는 한 줄도 바뀌지 않는다. `PermissionGuard` 는 토큰 주체를 만나면 권한을 조회하지 않는다 — 핸들러에 `@ApiTokenScope` 가 있으면 통과(범위는 이미 맞춰 봤다), 없으면 403. 발급 · 목록 · 끊기는 관리 경로 셋과 관리 화면 「API 토큰」이 맡는다.

**Tech Stack:** Prisma 7(멀티 파일 스키마) · NestJS 전역 가드 · node `crypto`(`randomBytes` · `timingSafeEqual`) · jest(단위 · 통합) · React 19 · TanStack Query.

## Global Constraints

- 커밋 메시지: 한국어, AI 생성 표시 금지. `--no-verify` 금지
- 스키마를 바꾸므로 **격리 레인**(`pnpm lane:new api-tokens --isolated`)에서 한다. 마이그레이션은 그 레인 DB 에만 적용한다
- 레인에서 `pnpm lint` 금지 — `pnpm lint:check`
- 일반 부품이다. 블로그 · 특정 파생 프로젝트의 범위 이름을 넣지 않는다 — **weaver2 는 범위를 하나도 정의하지 않는다**
- **계약**(아래 표)의 이름 · 경로는 파생 프로젝트(RLidea R3)가 기댄다. 바꾸려면 파생 쪽 계획과 함께 바꾼다
- `pnpm openapi:types` 산출물(`packages/api-client/src/types/api-schema.d.ts`)은 커밋한다

## 계약 (파생 프로젝트가 기대는 것)

| 조각 | 계약 |
|---|---|
| 스키마 | `ApiToken { id, userId, name, prefix, tokenHash, scopes String[], lastUsedAt?, expiresAt?, revokedAt?, issuedById?, revokedById?, createdAt }` (`api_tokens`). `prefix` · `tokenHash` 는 unique. `issuedById` · `revokedById` 는 users FK(`onDelete: SetNull`) — 보안 검토 M2 |
| 원문 | `wvt_<12 hex>_<64 hex>`. 앞의 `wvt_<12 hex>` 가 `prefix` 다. 발급 응답에 **한 번만** 실린다 |
| 헤더 | `Authorization: Bearer <원문>` |
| 데코레이터 | `@ApiTokenScope('x')` — `apps/core-backend/src/core/auth/api-token/decorators/api-token-scope.decorator.ts`. **핸들러에만** 붙는다(`MethodDecorator`, 가드도 핸들러만 본다). `@RequirePermission` 과 짝을 이루고, 세션을 누구에게나 열 때만 대신 `@AnySessionUser()`(같은 파일)를 붙인다 — `route-guard-coverage` 가 검사한다 |
| 데코레이터 | `@Actor() actor: RequestActor` — `…/api-token/decorators/actor.decorator.ts`. `RequestActor = { userId: string \| null, kind: 'SESSION' \| 'TOKEN' }`. `PostRevisionService.record` 의 `actor` 에 그대로 넘긴다 |
| 가드 1 | 토큰은 `@ApiTokenScope` 가 붙은 경로에서만 인증된다. 붙지 않은 경로(공개 경로 포함)에서는 **401**. 붙었지만 그 범위가 토큰에 없으면 **403** |
| 가드 2 | 주인의 권한은 `@RequirePermission` 을 **결코 채우지 못한다**. 경로 자신의 범위만 그 자리에 선다 — 범위 경로에서는 토큰이 통과하고, 범위 없는 경로의 `@RequirePermission` 은 토큰에 403. 세션은 지금처럼 그 권한이 있어야 한다 |
| 가드 3 | 끊은 · 만료된 토큰, 주인이 탈퇴 · 정지된 토큰은 401. 인증에 성공할 때마다 `lastUsedAt` 을 갱신한다 |
| CSRF | `isBearerOnly` 면제 — `Authorization: Bearer` 만 싣고 `access_token` 쿠키가 없는 요청 |
| 범위 목록 | `libs/shared/src/api-token-scopes.ts` 의 `API_TOKEN_SCOPES: ApiTokenScopeOption[]` (weaver2 는 빈 배열). 관리 화면이 고르기 단추로 보인다. 서버는 형식만 본다 — 자유 문자열 |
| 권한 | `PERMISSIONS.API_TOKEN.MANAGE` = `api-token:manage`. 시드는 어느 그룹에도 더하지 않는다 — `*:*`(SuperAdmin)만 가진다 |
| API | `GET /v1/admin/api-tokens?userId=` 목록 · `POST /v1/admin/api-tokens` 발급(201, `{ token, apiToken }`) · `POST /v1/admin/api-tokens/:id/revoke` 끊기. 모두 `api-token:manage`. 발급 · 끊기는 `assertCovers(요청자, 주인)` 도 통과해야 한다 — 보안 검토 M1 |
| UI | `/admin/api-tokens` 「API 토큰」 — 발급 · 목록 · 끊기. 사이드바 기본 메뉴에 든다 |

### 정한 것

- **앱이 발급한다.** SSO 는 사람의 로그인만 다룬다. 토큰은 이 앱의 경로 몇 개에만 닿으므로 이 앱이 발급 · 끊기를 쥔다
- **토큰은 누군가의 것이다(`userId` 필수).** 쓰기의 주체(`actor.userId`)가 비지 않게 한다. 사람이 아닌 호출자는 로그인 수단 · 권한 그룹이 없는 「서비스 계정」을 만들어 그 이름으로 발급하는 것을 권한다
- **원문 모양에 표지를 둔다(`wvt_`).** 가드가 JWT(점 셋으로 나뉨)와 헷갈리지 않고 한 줄 정규식으로 가른다. 깃 비밀 검사 같은 도구도 이 모양으로 잡을 수 있다
- **조회는 `prefix` 로, 대조는 해시로.** `prefix` 로 행을 찾고, 들어온 원문의 sha256 과 저장된 `tokenHash` 를 `crypto.timingSafeEqual` 로 비교한다. 원문은 어디에도 남기지 않는다(로그 포함). 해시 함수는 refresh 토큰과 같은 `hashToken`(`auth-crypto.util.ts`) — 256비트 무작위라 키 없는 sha256 으로 충분하다
- **가드는 `JwtAuthGuard` 안에 한 갈래로 둔다.** 전역 가드를 하나 더 세우면 순서(토큰이 먼저 `req.user` 를 채우고, 그다음 JWT 가 쿠키를 보고 덮어쓰는지)가 모듈 등록 순서에 기대게 된다. 갈래 판정은 「헤더가 API 토큰 모양인가」 하나뿐이고, 아니면 `super.canActivate` 로 그대로 넘긴다
- **헤더가 API 토큰 모양이면 쿠키보다 앞선다.** 쿠키와 함께 와도 토큰 갈래로 판정한다 — 세션으로 몰래 넘어가 권한을 얻는 길을 막는다. 그때는 `isBearerOnly` 가 면제하지 않으므로 CSRF 도 걸린다
- **범위 밖은 401 · 범위 부족은 403.** 범위가 붙지 않은 경로에서 토큰은 「인증 수단이 아니다」(401). 범위가 붙은 경로에서 다른 범위의 토큰은 「인증됐지만 모자란다」(403, OAuth 의 `insufficient_scope` 와 같은 태도). 범위가 없는 경로에서는 DB 를 읽지 않는다
- **범위가 `@RequirePermission` 을 대신한다 — 토큰에만.** 범위 경로에는 `@ApiTokenScope` 와 `@RequirePermission` 을 **함께** 붙이고, 둘은 각자 자기 호출자만 맡는다: 토큰은 범위로, 세션은 권한으로. 교집합(토큰도 주인의 권한까지)으로 하지 않는다 — 서비스 계정(RLidea R3 의 노엘)은 권한 그룹이 없다. 그래서 세션 관리자와 토큰이 같은 경로를 쓴다(보안 검토 H1)
- **`@RequirePermission` 이 빠진 범위 경로는 실수로 본다.** 로그인한 모든 세션 사용자에게 열리기 때문이다. 뜻이라면 `@AnySessionUser()` 로 밝힌다(동작은 바꾸지 않는 표시). `route-guard-coverage` 가 짝 없는 범위 경로와 클래스에 붙은 범위를 잡는다
- **범위는 핸들러에서만 읽는다**(`JwtAuthGuard` · `PermissionGuard` 모두). 클래스에 붙은 범위로 컨트롤러 전체가 토큰에 열리지 않게(보안 검토 L1)
- **가드 2 는 데코레이터만 다룬다.** 범위 경로의 핸들러가 주인 권한을 다시 묻는 서비스(예: 게시판 권한을 보는 `PostService.createPost`)를 부르면 주인의 권한이 그 안에서는 쓰인다. 범위 경로는 그런 서비스를 거치지 않는 자기 쓰기 길을 두는 것을 권한다(PostRevisionService 처럼)
- **발급 · 끊기는 상하 검사를 한다.** 토큰은 주인의 이름으로 쓰는 힘이라, 주인의 권한을 모두 가진 사람만 발급 · 끊기를 한다(`assertCovers`). 누가 했는지 `issuedById` · `revokedById` 와 로그(id · prefix · 주인 · 한 사람)에 남긴다. 원문은 로그에 쓰지 않는다
- **확인은 prefix 가 없어도 해시 대조를 한 번 한다**(더미 해시). `lastUsedAt` 은 `updateMany` 로 써서 행이 사라졌어도 500 이 나지 않는다(L3 · L4)
- **끊기는 되돌리지 않는다.** `revokedAt` 을 박고 끝 — 다시 살리기 경로는 없다. 이미 끊긴 토큰을 다시 끊으면 처음 시각을 그대로 두고 200
- **만료는 선택이다.** 발급 화면은 30일 · 90일 · 1년 · 없음을 고른다. 서버는 미래 시각만 받는다
- **`lastUsedAt` 은 매번 쓴다.** 토큰 경로는 드물게 불린다(초안 넣기 수준). 잦아지면 그때 「1분 안에 다시 쓰지 않음」으로 줄인다
- **발급 권한은 새 권한 하나(`api-token:manage`)다.** `admin:*` 안에 넣지 않는다 — 토큰은 남의 이름으로 쓰는 힘이라 2FA 초기화(`user:2fa:reset`)처럼 따로 뗀다. 시드는 어느 그룹에도 주지 않고 `*:*` 만 가진다. 발급하는 쪽은 주인을 고르려고 사용자 검색(`user:read`)도 쓴다
- **범위 문자열 형식:** `^[a-z0-9]+([:._-][a-z0-9]+)*$`, 64자 이하, 토큰당 1~20개, 겹치지 않게. 이름은 1~100자

---

### Task 1: 스키마 · 마이그레이션

**Files:**
- Modify: `apps/core-backend/prisma/schema/auth.prisma` (`ApiToken`, `User.apiTokens`)
- Create: `apps/core-backend/prisma/schema/migrations/<ts>_add_api_tokens/migration.sql`

```prisma
model ApiToken {
  id         String    @id @default(uuid())
  userId     String
  name       String
  prefix     String    @unique
  tokenHash  String    @unique
  scopes     String[]
  lastUsedAt DateTime?
  expiresAt  DateTime?
  revokedAt   DateTime?
  issuedById  String?
  revokedById String?
  createdAt   DateTime  @default(now())
  user        User      @relation("ApiTokenOwner", fields: [userId], references: [id], onDelete: Cascade)
  issuedBy    User?     @relation("ApiTokenIssuer", fields: [issuedById], references: [id], onDelete: SetNull)
  revokedBy   User?     @relation("ApiTokenRevoker", fields: [revokedById], references: [id], onDelete: SetNull)

  @@index([userId])
  @@map("api_tokens")
}
```

- [ ] `prisma migrate dev --create-only --name add_api_tokens` 로 SQL 을 만들고 읽어 본다(테이블 하나 · unique 둘 · 인덱스 하나 · FK 하나)
- [ ] 레인 DB 에 `pnpm db:deploy` · `pnpm db:generate`
- [ ] Commit

### Task 2: `ApiTokenService` (TDD, 단위)

**Files:**
- Create: `apps/core-backend/src/core/auth/api-token/api-token.crypto.ts` · `.spec.ts` (`generateApiToken` · `parseApiToken` · `matchesTokenHash`)
- Create: `apps/core-backend/src/core/auth/api-token/api-token.service.ts` · `.spec.ts`
- Create: `apps/core-backend/src/core/auth/api-token/repositories/*.ts` (`create-api-token.command` · `find-api-tokens.query` · `find-api-token-by-prefix.query` · `revoke-api-token.command` · `touch-api-token.command`)
- Create: `apps/core-backend/src/core/auth/api-token/api-token.module.ts`

시험(먼저 쓰고 빨강을 본다):
- [ ] 원문은 `wvt_<12hex>_<64hex>`, `prefix` 는 그 앞부분. 매번 다르다
- [ ] `parseApiToken` 은 JWT · 빈 값 · 모양이 어긋난 값에 `null`
- [ ] 발급은 해시만 저장한다 — 저장소 인자에 원문이 없다. 응답에만 원문이 있다
- [ ] 발급: 주인이 없거나 탈퇴했으면 404, 지난 만료 시각이면 400
- [ ] `verify`: 맞는 토큰이면 토큰과 주인을 준다. 해시가 다르면 · 끊겼으면 · 만료됐으면 · 주인이 정지 · 탈퇴했으면 `null`
- [ ] `verify` 는 `timingSafeEqual` 로 비교한다(모듈 목으로 불렸는지 본다)
- [ ] 끊기: `revokedAt` 이 비었을 때만 박는다. 없는 id 면 404

### Task 3: 데코레이터 · 가드 (TDD, 단위)

**Files:**
- Create: `…/api-token/decorators/api-token-scope.decorator.ts` · `actor.decorator.ts`
- Modify: `apps/core-backend/src/core/auth/guards/jwt-auth.guard.ts` · `jwt-auth.guard.spec.ts`
- Modify: `apps/core-backend/src/core/permission/guards/permission.guard.ts`
- Create: `apps/core-backend/src/core/permission/guards/permission.guard.spec.ts`
- Modify: `apps/core-backend/src/common/types/express.d.ts` (`Request.apiToken`)
- Modify: `apps/core-backend/src/core/auth/auth.module.ts` (`ApiTokenModule` import)

시험(`jwt-auth.guard.spec.ts` 의 최소 앱에 범위 경로를 더한다):
- [ ] 범위 경로 + 맞는 토큰 → 200, `@Actor()` 가 `{ userId: 주인, kind: 'TOKEN' }`, `lastUsedAt` 갱신이 불린다
- [ ] 범위 경로 + 다른 범위 토큰 → 403, 갱신 없음
- [ ] 범위 없는 보호 경로 · 공개 경로 + 토큰 → 401, DB 를 읽지 않는다
- [ ] 끊김 · 만료(`verify` 가 `null`) → 401
- [ ] 쿠키 세션 + 범위 경로 → 지금처럼 세션으로 통과, `@Actor()` 는 `SESSION`
- [ ] `PermissionGuard`: `req.apiToken` 이 있으면 권한을 조회하지 않는다 — 핸들러에 범위가 있으면 통과, 없으면 403. 데코레이터가 없으면 지금처럼 통과

### Task 4: CSRF Bearer 면제

**Files:**
- Modify: `libs/common/src/global/middleware/security.middleware.ts` (`isBearerOnly` 를 `CSRF_EXEMPTIONS` 에)
- Modify: `libs/common/src/global/middleware/security.middleware.spec.ts`

- [ ] Bearer 만 → 면제, Bearer + `access_token` 쿠키 → 면제 아님, 헤더 없음 → 면제 아님

### Task 5: 관리 경로 (TDD, 통합)

**Files:**
- Create: `…/api-token/controllers/admin-api-token.controller.ts` · `…/api-token/dto/*.ts`
- Modify: `libs/shared/src/index.ts` (`PERMISSIONS.API_TOKEN`) · `libs/common/src/constants/permissions.const.ts` (`ALL_PERMISSIONS` 라벨)
- Create: `libs/shared/src/api-token-scopes.ts`
- Create: `apps/core-backend/test/integration/api-tokens.integration.spec.ts`

통합 시험은 시험 전용 컨트롤러(범위 + `@RequirePermission` 경로, 범위 + `@AnySessionUser` 경로, 클래스에 범위를 붙인 컨트롤러)를 얹은 앱으로 돈다:
- [ ] 발급 응답에만 원문이 있고, DB 에는 `sha256(원문)` 만 있다 — 목록 응답에도 원문 · 해시가 없다
- [ ] 가드 1: 범위 없는 **모든** 경로(공개 · 권한 없음 · 관리 — 라우트 메타데이터에서 모은다)는 최고관리자 주인의 토큰에도 정확히 401 · 다른 범위 403 · 클래스 범위 401
- [ ] 가드 2: 권한 없는 주인의 토큰이 범위 + `@RequirePermission` 경로 200 · 권한 없는 회원 세션 403 · 관리자 세션 200
- [ ] 상하 검사: 발급 권한만 가진 관리자는 최고관리자 이름으로 발급 · 끊기 403, 권한 없는 주인으로는 발급 201 · `issuedById` · `revokedById` 가 남는다
- [ ] 가드 3: 끊은 토큰 401 · 만료 토큰 401 · 주인 정지 401 · 성공하면 `lastUsedAt` 이 찍힌다
- [ ] CSRF: 토큰 요청은 CSRF 헤더 없이 POST 가 된다
- [ ] 관리 경로: `api-token:manage` 가 없는 Admin 은 403, 끊기는 되돌리지 않는다
- [ ] `route-guard-coverage` 가 새 관리 경로까지 덮어 그대로 초록, 범위 경로의 모양(짝 · 핸들러 전용)도 검사

### Task 6: 관리 화면

**Files:**
- Create: `apps/core-frontend/src/app/(admin)/admin/api-tokens/page.tsx`
- Create: `apps/core-frontend/src/features/admin/api-tokens/{api,hooks,components}/…` · `query-keys.ts` · `types.ts`
- Modify: `apps/core-frontend/src/shared/components/layout/admin-sidebar.tsx` (「API 토큰」)
- Modify: `apps/core-frontend/src/features/admin/permissions/constants.ts` (권한 라벨)

- 목록은 `DataTable`(이름 · 주인 · 앞부분 · 범위 · 마지막 사용 · 만료 · 상태 · 끊기). 「끊긴 것도 보기」는 URL 상태(`useUrlState`)
- 발급 모달: 이름 · 주인(사용자 검색, 권한 그룹 모달과 같은 `useAdminUsers`) · 범위(등록된 범위 단추 + 직접 입력) · 만료
- 발급 뒤 원문을 한 번 보여 주는 모달 — 「이 창을 닫으면 다시 볼 수 없습니다」 · 복사 단추
- 끊기 확인 대화상자
- 프런트 단위 시험 도구가 없다 — 검증은 typecheck · lint

### Task 7: OpenAPI 타입 · 검증

- [ ] `pnpm openapi:types` → `api-schema.d.ts` 커밋. 화면 타입은 `components['schemas']` 에서 파생
- [ ] `pnpm typecheck` · `pnpm lint:check` · `pnpm test:core`
- [ ] `pnpm test:integration:run -- api-tokens route-guard-coverage admin-privilege auth-security` (레인 DB)

## 파생 프로젝트가 upstream 을 merge 할 때

- 마이그레이션 하나(`add_api_tokens`)가 들어온다. `pnpm db:deploy` · `pnpm db:generate`
- `User` 모델에 역관계 셋(`apiTokens` · `issuedApiTokens` · `revokedApiTokens`)이 생긴다
- `security.middleware.ts` 는 두 덩어리(`isBearerOnly` 함수 · `CSRF_EXEMPTIONS` 목록)에서 충돌한다. **두 곳 모두 ours(RLidea)를 남긴다** — `isBearerOnly` 본문은 RLidea 와 한 글자도 다르지 않게 두었다
- 범위 경로는 `@ApiTokenScope` + `@RequirePermission` 짝으로 쓴다. 토큰은 범위로, 세션은 권한으로 통과한다. `route-guard-coverage` 가 짝 없는 범위 경로를 잡는다
- `JwtAuthGuard` 생성자에 `ApiTokenService` 가 늘었다. 파생 쪽에 이 가드를 손으로 세우는 시험이 있으면 목을 하나 더한다
- 범위는 파생 쪽이 정한다: 경로에 `@ApiTokenScope('…')` 를 붙이고, 관리 화면에서 고를 수 있게 `API_TOKEN_SCOPES` 에 한 줄 더한다
- 발급하려면 `api-token:manage` 가 있어야 한다. SuperAdmin 이 아닌 그룹에 주려면 관리 화면 「권한 관리」에서 더한다
