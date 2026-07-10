# 09. 테스트

> 3층 테스트 구조(유닛·통합·e2e)가 각각 무엇을 검증하고, 어떻게 실행하며, 어떤 픽스처에 의존하는지.

## 한눈에 보기

| 층 | 도구 | 대상 | DB | 실행 |
|---|---|---|---|---|
| 유닛 | Jest (ts-jest) | 서비스·라이브러리 로직, 의존성은 목 | 불필요 | `pnpm test` |
| 통합 | Jest + supertest | **실제 CoreModule 부팅** + HTTP 왕복 | **실제 Postgres** | `pnpm test:integration:run` |
| e2e | Playwright | 브라우저 → Next → NestJS → DB 풀스택 | 실제 Postgres + 시드 | `pnpm --filter core-frontend e2e` |

## 1. 유닛 테스트

- 설정: `apps/core-backend/jest.config.js` — `apps/core-backend/src/**`와 `libs/**`의 `*.spec.ts`를 수집합니다. `@weaver2/*` 별칭은 `moduleNameMapper`로 해석
- **모킹 관례**: `Test.createTestingModule`보다 **생성자에 목을 직접 주입**하는 스타일이 주류입니다:

```ts
// board-permission.service.spec.ts 패턴
const permission = { hasResourcePermission: jest.fn() };
const service = new BoardPermissionService(
  {} as PrismaService,
  permission as unknown as PermissionService,
);
// 반환값 + 호출 인자(toHaveBeenCalledWith)를 함께 검증
```

- 무엇을 유닛으로 커버하나: 서비스 분기 로직(로그인 검증 순서, 신고 처리, 2FA), 순수 라이브러리(keyset builder, cursor utils, hasPermission), 리스너의 실패 격리 등

### 실행 스크립트의 비밀 — `scripts/run-test.sh`

`pnpm test`는 `run-test.sh`를 거칩니다. 이 스크립트는 대화형이면 어느 앱을 테스트할지 묻고, **비대화형(CI·pre-commit·파이프)이면 자동으로 core-backend를 선택**합니다. 알아둘 것:

- `pnpm test:integration`은 스크립트 경유 시 **watch 모드**로 돕니다 — 원샷 실행은 `pnpm test:integration:run`
- pre-commit 훅이 `pnpm test`를 실행하므로 **커밋할 때마다 유닛 테스트 전체가 돕니다** (§4)

## 2. 통합 테스트

`apps/core-backend/test/integration/` — 설정은 `test/jest-integration.json`(`*.integration.spec.ts`, timeout 30s, otplib 목).

구조 (`auth-security.integration.spec.ts`가 본보기):

1. `createTestApp()`(`helpers/test-app.helper.ts`)이 **실제 CoreModule 전체를 컴파일**하고 cookie-parser + 버저닝 + `setNestApp`까지 프로덕션과 동일하게 조립
2. `helpers/auth.helper.ts`가 실제 HTTP 흐름을 재현: CSRF 토큰 발급 → 쿠키+헤더로 로그인 → 인증 쿠키 획득
3. **픽스처는 self-contained** — 시드에 의존하지 않고 `${prefix}_${Date.now()}@integration-test.local`로 매번 고유 사용자를 만들고 `afterAll`에서 `deleteMany`로 정리
4. `DATABASE_URL`의 실제 Postgres 필요 — 로컬에서는 dev DB를 그대로, CI에서는 서비스 컨테이너(§5)

현재 검증 내용: 계정 잠금(5회 실패), 권한 가드(403/401), 정지 계정 차단 — **보안 회귀 방지가 목적**입니다.

> `setup.ts`가 `NODE_ENV=development`를 설정하는 이유: `DevThrottlerGuard`가 development에서 rate limit을 통과시키므로, 5회 연속 로그인 실패 같은 시나리오가 throttle에 막히지 않게 하기 위함입니다 ([03장 §9](03-auth.md#9-rate-limiting-요약)).

## 3. e2e (Playwright)

`apps/core-frontend/e2e/` — 상세 안내는 [`e2e/README.md`](../../apps/core-frontend/e2e/README.md).

- **`webServer` 설정이 백/프론트를 자동 기동**합니다: 로컬은 dev 서버 2개(`reuseExistingServer: true` — 이미 떠 있으면 재사용), CI는 빌드 산출물(`next start` + `pnpm prod:core`)
- **`workers: 1` 순차 실행** — 백엔드가 단일 공유 DB라서 병렬을 끕니다. 시나리오 간 상태 간섭을 조심할 것
- **시드 의존**: `auth-login.spec.ts`는 시드된 `admin@weaver.com / secret!!`으로 로그인해 `/dashboard` 도달을 검증합니다. 사전조건: `pnpm db:migrate` + `pnpm db:seed`. **시드 계정을 바꾸면 이 spec도 함께** (CHARTER §9 체크리스트 13번)

```bash
pnpm --filter core-frontend e2e:install   # 1회: chromium 설치
pnpm --filter core-frontend e2e           # 실행
pnpm --filter core-frontend e2e:ui        # UI 모드 (작성·디버깅)
```

현재 spec은 1개(로그인 골든패스)입니다. 인프라는 갖춰져 있으므로 시나리오 추가는 spec 파일 하나씩입니다 (CHARTER §8, 확장은 ROADMAP).

## 4. 테스트 픽스처 — 시드 계정

`prisma/seed/user.seed.ts`의 5계정, 전부 비밀번호 `secret!!`, 인증 완료 상태:

| username | email | 그룹 | 특징 |
|---|---|---|---|
| admin | admin@weaver.com | Admin | e2e가 의존 |
| weaver | weaver@weaver.com | User | 일반 회원 |
| operator | operator@weaver.com | Operator | CUID 꼬리 `op3r4t0r` |
| moderator | moderator@weaver.com | Moderator | CUID 꼬리 `m0d3r4t0` |
| suspended | suspended@weaver.com | Suspended | 정지 계정 테스트용 |

leetspeak CUID(CHARTER §7.1의 의도된 예외)는 로그·DB를 눈으로 훑을 때 어느 계정인지 즉시 식별하기 위한 디버깅 자산입니다.

## 5. pre-commit과 CI

**pre-commit** (`.husky/pre-commit`): ① secret/key 파일 staged 차단 → ② `pnpm test`(유닛 전체). 커밋이 곧 유닛 테스트 게이트입니다.

**CI** (`.github/workflows/ci.yml`): install → {secret-files, lint, test-unit, test-integration, build-backend, build-web, prisma-check} → test-e2e → **`ci-success` 단일 게이트**. 테스트 관련 요점:

- 통합·e2e는 각각 `postgres:16-alpine` 서비스 컨테이너 + `prisma migrate deploy` (e2e는 `pnpm db:seed`까지)
- 통합 테스트 env에 **더미 SMTP_* 4종이 필수** — EmailService 생성자가 SMTP env 없으면 throw하기 때문. 새 필수 env를 추가하면 CI env에도 추가해야 합니다
- e2e는 CI에서 retry 2회, 실패 시 Playwright 리포트/트레이스가 아티팩트로 업로드됩니다

## 새 코드에 테스트를 붙일 때

1. **서비스 로직** → 같은 디렉토리에 `*.spec.ts`, 생성자 목 주입 패턴 (§1)
2. **보안·권한이 걸린 API** → `test/integration/`에 `*.integration.spec.ts`, self-contained 픽스처로
3. **사용자 여정** → `e2e/`에 spec 추가 (workers 1 전제, 시드 의존 최소화)
4. 커밋 전 `pnpm test`는 자동으로 돌지만, 통합은 자동이 아니므로 스키마·가드를 건드렸다면 `pnpm test:integration:run`을 직접 실행하세요

## 더 보기

- e2e 상세: [`apps/core-frontend/e2e/README.md`](../../apps/core-frontend/e2e/README.md)
- CI 전체 구성: [README "CI / GitHub Actions"](../../README.md#-ci--github-actions)
- 개발 워크플로우(브랜치·PR): [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
