# OIDC 손님 모드 (`AUTH_MODE=sso`) — 로그인을 바깥 계정 서버(accounts)에 맡긴다

> 상태: **승인 (2026-10-19, Q1~Q12)** — 파생 프로젝트 RLidea 의 계획(`rlidea.app/docs/design/plans/2026-10-19-sso-accounts-1.md`, 이하 「RLidea 계획」)에서 **weaver2 몫(W1~W5)만** 옮겨 왔다. RLidea 몫(R1~R5) · accounts 몫(A1~A3) · RLidea 만의 갈래는 그 문서에 있다.
> 이 문서의 결정 D1~D15 · 「설정 이름」 표 · 보안 점검표 · W1~W5 가 계약이다. 파생 프로젝트(RLidea R2 · R3)가 경로 · 응답 칸 · 훅 모양에 기댄다 — 바꾸려면 RLidea 계획과 함께 바꾼다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** weaver2 에 「OIDC 손님 모드」를 일반 기능으로 짓는다. `AUTH_MODE=sso` 면 웹 로그인(관리 `/login`)이 바깥 OIDC 발급자(RLidea 에서는 accounts.rlidea.com)로 가고, 콜백이 끝나면 **지금과 같은 세션 쿠키**(`access_token` · `refresh_token`)를 준다. 쿠키 뒤의 앱은 바뀌지 않는다. 로컬 로그인 코드는 `AUTH_MODE=local`(기본) 뒤에 그대로 두어 되돌릴 수 있게 한다.

**Architecture:** `core/auth/oidc/`. 백엔드가 confidential client(`client_secret_basic` + PKCE S256)로 콜백을 받아 code 를 바꾸고, id_token 을 JWKS 로 검증하고, userinfo 에서 이메일을 받는다. 그다음 `User.ssoSubject` 로 사람을 찾거나 새로 만든 뒤 `SignInCompletionService` 를 거쳐 기존 세션을 준다. **이메일로 저절로 잇지 않는다** — 이미 있는 행은 운영자가 CLI 로 한 번 잇는다(Q12). state · nonce · verifier · next · lang · 입구는 10분짜리 서명 쿠키 `oidc_tx` 에 둔다. `AUTH_MODE=sso` 면 로컬 로그인 · 가입 · 재설정 · 2FA · OAuth 경로가 404 로 닫힌다. 파생 프로젝트는 설정값과 훅(`OIDC_USER_HOOKS`) · 허용 목록 확장(`PUBLIC_WRITE_ALLOWLIST_EXTRAS`)만 가진다.

**Tech Stack:** NestJS · Prisma(Postgres) · Jest(단위) · supertest(통합) · Playwright(e2e) · Next 16 App Router. 새 의존성은 Q1 스파이크로 정한다(아래 「Q1 스파이크 결과」).

---

## 열린 질문 — 2026-10-19 주인님 결정: Q1~Q11 은 「노엘 제안」대로, Q12 는 주인님 답

| # | 질문 | 갈래 | 결정 |
|---|---|---|---|
| Q1 | **OIDC 손님 라이브러리** | (a) `openid-client@6`(panva, accounts 의 `oidc-provider` 와 같은 저자) (b) 새 의존성 없이 — `node:crypto` | **(a), 단 W3 첫 스파이크로 거른다.** v6 는 ESM 전용이고 백엔드는 `module: commonjs` · Jest 는 ts-jest + `--experimental-vm-modules`(`package.json:47, 52`)다. ESM 모듈을 목으로 바꾼 선례(`test/integration/__mocks__/otplib.js`)도 있다. **관문 다섯이 모두 통과해야 (a)**: `pnpm test:core` · `pnpm test:integration` · `pnpm typecheck:core`(commonjs) · `nest build` · Node 24 에서 `node dist/main.js` 가 뜸. 시험의 가짜 발급자가 http 라 (a)는 시험에서만 `allowInsecureRequests` 를 건다(운영 설정에서는 못 켜게). 하나라도 막히면 (b) — 바탕은 이미 있는 `core/auth/oauth/providers/apple.provider.ts:156-257`(RS256 + JWKS + `createPublicKey`). (b)로 가면 그 JWKS 다시 받기(모르는 kid)에 **60초 한 번** 제한을 더한다(지금은 제한 없음). 어느 쪽이든 포트 `OidcClient` 뒤에 둔다 |
| Q2 | 모르는 `sub` 에 `email_verified=false`, 같은 이메일 행 없음 | (a) 거절 「accounts 에서 이메일 인증을 마치세요」 (b) 새 계정을 만든다 | **(a).** 미검증 계정은 결제 권리를 못 받아(D9) 헛계정이 된다. 지금 accounts 는 비밀번호 가입뿐이고 가입 때 메일 인증을 거친다. 이미 `sub` 로 이어진 사람은 막지 않는다(이메일 동기화만 건너뜀) |
| Q4 | accounts 에서 이메일을 바꾸면 RLidea 도 따라가나 | (a) 로그인할 때마다 맞춘다(`email_verified=true` 일 때만, 다른 행이 쓰면 건너뛰고 로그) (b) 안 따라간다 | **(a).** 권리 붙이기(`claimByEmail`)가 지금 이메일을 보므로 따라가야 새 주소로 산 것이 붙는다. 이미 붙은 권리는 `userId` 로 붙어 있다. ⚠ 이 규칙은 accounts 의 `email_verified` 를 믿는다 — 지금 accounts 공급자는 비밀번호뿐이라 문제없다. **accounts 가 Naver 를 켜기 전에 Naver 의 `emailVerified: true` 고정을 고쳐야 한다**(아래 의존) |
| Q5 | 로그인 화면 모양 | (a) 단추 하나 + 오류 문구 (b) 열자마자 accounts 로 | **(a).** (b)는 콜백 실패 → 로그인 화면 → accounts 의 고리가 생긴다 |
| Q6 | 로그아웃이 accounts 까지 끝내나 | (a) 늘 end_session 으로 보낸다 (b) rlidea.app 만 | **(a).** 공용 PC 에서 rlidea.app 만 끝내면 다음 사람이 단추 한 번으로 앞사람 계정에 들어간다. accounts 확인 화면에서 「RLidea 계정 로그인 유지」를 고르면 accounts 로그인만 남는다 — 사람이 고르는 일이다 |
| Q7 | 서버가 accounts 에 닿는 길 | (a) 공개 주소 그대로 — Cloudflare 경유 (b) `/etc/hosts` 로 127.0.0.1 | **(a), 실측 끝.** 서버에서 discovery · jwks · token 이 닿았다(틀린 비밀로 401 `invalid_client` = 요청이 들어감). ⚠ Python urllib 기본 UA 는 Cloudflare 1010 으로 막혔고 Node fetch 기본 UA 는 통과했다 — W3 는 **UA 를 따로 정하지 않는다**(Node 기본) |
| Q8 | 백엔드 포트에서만 뜨는 정적 관리 뷰(`/admin/login`) | (a) sso 에서 로그인 칸을 닫고 안내 (b) SSO 를 붙인다 | **(a), weaver2 W1 에서.** 이 뷰는 백엔드 출처에서만 뜨고(`e2e/admin-view-login.spec.ts` 주석) 콜백 · 쿠키 출처가 rlidea.app 이라 붙일 수 없다. weaver2 코드(`system/admin/view` · `assets/admin/admin-login.html`)라 RLidea 에서 고치지 않는다 |
| Q9 | SSO e2e 를 CI 에 넣나 | (a) `dev`→`main` PR e2e 잡에 `e2e-sso` (b) 레인에서만 | **(a), weaver2 `ci.yml` 에서.** Playwright `sso` 프로젝트 전체를 돌린다(M4). 기존 e2e 는 `AUTH_MODE=local` |
| Q11 | 로컬 로그인 코드는 언제 지우나 | (a) 운영 전환 30일 무사고 뒤, 따로 계획 (b) 안 지운다 | **(a)** |
| Q12 | **RLidea 사람을 accounts 로 옮기나 · 이메일로 저절로 잇나** | (a) 옮기지 않는다. 자동 잇기 없음, 주인님 행만 CLI 로 한 번 (b) accounts 화면 명세의 옛 결정대로 rlidea.app 사람을 accounts DB 로 옮긴다 | **(a) — 주인님 답.** accounts 에 `centell@me.com` 이 이미 있다. 이 결정은 accounts 화면 명세 `:119`(「기존 rlidea.app 계정 — 옮겨 옴」)를 **대체한다**. accounts 는 명세를 c7d4c4a 에서 고쳤다(옮기지 않음 · 주인님 sub 한 번 · 자동 잇기 없음 · 겹치면 충돌) |

## Q1 스파이크 결과 — (a) `openid-client@6` (2026-10-19, 레인 `sso`)

`openid-client@6.8.8`(의존: `oauth4webapi@3.8.8` · `jose@6`)을 넣고, `import * as client from 'openid-client'` 를 부르는 provider 를 `AuthModule` 에 임시로 걸어 관문 다섯을 쟀다. **다섯 모두 통과 → (a).**

| 관문 | 결과 |
|---|---|
| `pnpm test:core` (jest, `--experimental-vm-modules`) | 통과 — `require(esm)` 로 풀림. 플래그 없이 돌리면 「Must use import to load ES Module」로 깨지지만, 이 플래그는 NestJS 12(ESM 전용) 때문에 이미 `run-test.sh` · `test:core` · `ci.yml` 모두에 걸려 있다 |
| `pnpm test:integration` (같은 플래그) | 통과 — CoreModule 이 openid-client 를 불러온 채 `password-reset-route` 2건 초록 |
| `pnpm typecheck:core` (commonjs) | 통과 — `package.json` 의 `types` 로 타입이 풀린다 |
| `nest build` (webpack, node-externals) | 통과 — 번들은 `require('openid-client')` 를 그대로 남긴다 |
| Node 24 에서 `node dist/apps/core-backend/main.js` | 통과 (로컬 v24.17.0) — `require(esm)` 이 플래그 없이 풀려 provider 가 돌고 `/v1/auth/providers` 200 |

라이브러리가 대신 해 주는 것과 우리가 더하는 것:

- 안내판 `issuer` 대조(`discovery`) · authorize 응답의 `iss`(안내판이 `authorization_response_iss_parameter_supported` 면 필수) · state · PKCE · nonce · `aud`/`azp` · `exp`/`iat` · userinfo `sub` 대조(`fetchUserInfo(…, expectedSubject)`)는 openid-client 가 한다
- **RS256 만**: 손님 메타데이터 `id_token_signed_response_alg: 'RS256'` — `none` · HS 는 거절
- **서명 검증**: `enableNonRepudiationChecks` — 이것 없이는 TLS 로 받은 id_token 의 서명을 보지 않는다(oauth4webapi 기본)
- **시계 허용 60초**: `[client.clockTolerance]: 60`
- **5초 시간 제한**: `timeout: 5` — 모든 요청에 `AbortSignal.timeout(5000)`
- **JWKS**: oauth4webapi 의 캐시가 **5분**(계획의 10분보다 짧다 — 더 자주 받을 뿐 안전 쪽), 모르는 kid 면 받은 지 **60초가 지났을 때만** 다시 받는다 — 계획의 「60초에 한 번」과 같은 규칙이 라이브러리에 이미 있다
- **평문 http**: `allowInsecureRequests` 는 **발급자가 loopback(localhost · 127.0.0.1 · ::1) http 일 때만** 건다. 시험 · e2e 의 가짜 발급자와 로컬 accounts(`http://127.0.0.1:4100/oidc`)가 여기 든다. 운영 발급자는 https 라 걸 수 없고, http 비-loopback 발급자는 부팅이 멈춘다(`auth-mode.ts`)
- `iss` 응답 매개변수는 안내판 값과 무관하게 **우리가 먼저 요구**한다(D4 ③)

## 구현 기록 (2026-10-19, 레인 `sso`) — 계획과 다르게 간 곳

W1~W5 를 이 계획대로 지었다. 다르게 간 곳과 그 이유:

| # | 계획 | 실제 | 이유 |
|---|---|---|---|
| 1 | 가짜 발급자 포트 `4180 + (API − 4000)`(런타임 4180, 격리 4190~4199) | **`4280 + (API − 4000)`**(런타임 4280, 격리 4290~4299) | 4190 은 Fetch 표준의 「bad port」(ManageSieve)라 Node fetch 가 `TypeError: fetch failed (bad port)` 로 거절한다 — 레인 4010 → 4190 에서 실측. 4100(로컬 accounts)은 그대로 비워 둔다 |
| 2 | 포트 `OidcClient` 에 `verifyIdToken` 따로 | `exchange` 안에서 검증 | openid-client 의 `authorizationCodeGrant` 가 교환과 id_token 검증을 한 번에 한다. 검증 항목(RS256 · 서명 · iss · aud/azp · exp/iat 60초 · nonce)은 그대로이고 `oidc-client.spec.ts` 가 잰다 |
| 3 | JWKS 10분 캐시 | oauth4webapi 의 **5분** 캐시, 모르는 kid 는 받은 지 60초가 지났을 때만 다시 받음 | 라이브러리 규칙이 계획의 「60초에 한 번」과 같고 캐시는 더 짧다(안전 쪽) |
| 4 | next 시험 값 `/\tevil.com` · `\evil.com` | `/\t/evil.com` · `\\evil.com` · `/\evil.com` | 앞의 둘은 URL 파서가 `/evil.com`(같은 출처의 경로)으로 읽어 위험하지 않다. 실제로 `//evil.com` 이 되는 값으로 잰다 |
| 5 | 탈퇴 → 같은 sub 가 다시 오면 새 행 | weaver2 에서는 **`account_deleted`** | weaver2 는 탈퇴 때 이메일을 익명화하지 않아 탈퇴 행이 이메일을 쥔다(유일 제약). 파생 프로젝트가 `USER_WITHDRAWAL_HOOKS` 로 익명화하면 새 행이 된다 — RLidea 는 이미 익명화한다 |
| 6 | 새 사람 `locale = lang` | weaver2 `User` 에 언어 칸이 없어 쓰지 않음. `afterSignIn` 의 `meta.lang` · `meta.created` 로 넘긴다 | 파생 프로젝트(RLidea)가 훅에서 정한다 |
| 7 | 훅 `names · afterSignIn · onConflict · onLink` | + **`onUnlink`** | `sso:unlink` 도 기록이 남게 |
| 8 | `AuthModeGuard` 가 인증보다 먼저 | **인증 다음** | API 토큰 계약(「범위 없는 경로는 늘 401」, `api-tokens.integration.spec.ts`)을 지킨다. 공개 경로는 여전히 404, 로그인이 필요한 닫힌 경로는 로그인 전 401 · 뒤 404 |
| 9 | 운영자 손을 `build-seed.cjs` 처럼 릴리스에 묶고 `node dist/scripts/sso-link.js` | `pnpm sso:link`(ts-node, 앱 모듈을 띄워 훅까지 부름) | weaver2 에는 시드 번들 틀이 없다. 파생 프로젝트의 배포 틀이 dev 의존성을 빼면 그 틀에서 묶는다(핸드북 11장) |
| 10 | 프런트 시험 vitest | `packages/auth/src/sso.ts`(순수 도우미)를 jest 로, 화면은 Playwright `sso` 프로젝트로 | weaver2 에 vitest 가 없다. 백엔드 jest 의 roots 에 `packages/auth/src` 를 더했다 |
| 11 | Playwright `testMatch: /sso.*\.spec\.ts$/` | `/\/[^/]*sso[^/]*\.spec\.ts$/` | 정규식은 **절대 경로**에 맞춰진다 — 레인이 `.claude/worktrees/sso/…` 라 모든 스펙이 sso 로 잡혔다 |
| 12 | tx 를 못 읽을 때 실패 주소 | 표의 `site` → `admin` → 첫 입구 (D4 그대로) | W4 시험 줄의 「admin 실패 주소」는 기본 표(`admin=/login`)일 때다. 통합 시험은 `site` 가 있는 표라 `/ko/account/sign-in/` 을 잰다 |

검증(레인 DB `weaver2_sso`): `pnpm typecheck` · `pnpm lint:check`(오류 0) · `pnpm test:core` 66 묶음 552 · `pnpm test:integration` 18 묶음 194 · Playwright `sso` 6(빌드본 + 가짜 발급자, 백엔드 `AUTH_MODE=sso`) · `chromium` 29(local).

### 보안 검토 반영 (2026-10-19, REQUEST CHANGES → 고침)

- **H1** 점 마디 열린 리다이렉트(`/.//evil.com` · `/..//evil.com` · `/%2e//evil.com` · `/a/..//evil.com` · `/x/../\evil.com` · `/./\evil.com`) — 출처 비교 뒤 **풀린 경로**가 `//` · `/\` 로 시작하면 버린다. 백엔드 `normalizeSameOriginPath`(next · 설정의 실패 주소 · 기본 next), 프런트 `safeRedirectPath`(`packages/auth/src/redirect-path.ts`). 여섯 벡터를 단위 · 통합 시험에
- **M1** `oidc_tx` 의 `__Host-` · Secure 는 redirect URI 가 https 인지로 정한다(NODE_ENV 아님)
- **M2** 훅은 3초(`OIDC_HOOK_TIMEOUT_MS`)까지만 기다린다 · `onConflict` 는 기록 전용(`ssoSubject` 를 쓰면 안 됨, 잇기는 `sso:link` 만)
- **L1** 요청 로그는 SSO · OAuth 콜백의 쿼리를 떼고 경로만 · **L2** `ACCOUNTS_OIDC_ACCOUNT_URL` 은 https(localhost 만 http) · **L3** 정지된 사람은 이메일 맞추기를 건너뜀 · **L5** 핸드북에 `TRUST_PROXY` · L4 는 건너뜀(code 1회용 + nonce)

## Global Constraints

- **스키마를 바꾸는 레인은 격리 레인이다.** `pnpm lane:new sso --isolated`. W2(`ssoSubject`)가 스키마를 바꾼다. `--with-backend` 는 공용 DB 를 바꾼다
- 검사는 `pnpm typecheck` · `pnpm lint:check` · `pnpm test:core` · `pnpm test:web` · `pnpm test:integration`(레인 DB). **`pnpm lint` 는 쓰지 않는다**(`--fix`)
- CI 통합 · e2e 는 `dev`→`main` PR 에서만 돈다. **테스트는 네트워크를 쓰지 않는다** — 모든 시험은 가짜 발급자를 쓴다. 통합 시험은 시드에 기대지 않는다
- e2e 는 `pnpm lane:e2e <레인> …` 로만. 서버를 손으로 띄우지 않는다. **런타임 `test.skip` 으로 SSO 스펙을 거르지 않는다** — Playwright 프로젝트로 가른다(W5)
- 엔드포인트가 바뀌면 `pnpm openapi:types`
- 프런트는 `fetch()` 를 직접 쓰지 않는다(`ApiClient`). SSO 시작은 API 호출이 아니라 **문서 이동**이다 — 지금 OAuth 단추(`lib/oauth.ts`)와 같다
- 파생 프로젝트는 weaver2 파일(`core/auth/**` · `auth.prisma` · `packages/auth/**` · `libs/common/**` · `system/admin/**` · `ci.yml` · `lane.sh` · `playwright.config.ts`)을 고치지 않는다 — 훅 · 확장 토큰 · 설정으로 더한다
- 비밀(`ACCOUNTS_OIDC_CLIENT_SECRET`)은 로그 · 오류 메시지 · 시험 스냅숏에 나오지 않는다. 이메일도 로그에 남기지 않는다(추적은 `sub` 로)
- 커밋 메시지에 AI 생성 표시를 넣지 않는다. 로컬 커밋만 하고 push 는 확인을 받는다

## 설정 이름

weaver2 의 **공급자** 쪽(accounts 가 쓰는 `oidc-provider`)이 이미 `OIDC_ISSUER` · `OIDC_CLIENTS` · `OIDC_JWKS` 를 쓴다(`accounts.rlidea/apps/core-backend/.env.example:141`). 그래서 **손님** 쪽은 그 이름을 쓰지 않는다. 가장 단순한 길: weaver2 손님 모드가 **서버에 이미 들어간 이름 `ACCOUNTS_OIDC_*` 를 그대로 읽는다.** 「accounts 서버에 붙는 손님」이라는 뜻이라 weaver2 파생 모두에게 맞고, 옮겨 적기(같은 비밀 두 벌)도 이름 바꾸기 층도 없다.

| 이름 | 필수 (sso) | 기본 | 뜻 |
|---|---|---|---|
| `AUTH_MODE` | — | `local` | `local` · `sso`. 그 밖이면 부팅 멈춤 |
| `ACCOUNTS_OIDC_ISSUER` | ○ | | `https://accounts.rlidea.com/oidc`. 안내판의 `issuer` 와 글자까지 같아야 한다 |
| `ACCOUNTS_OIDC_CLIENT_ID` | ○ | | `rlidea-app` · `rlidea-app-staging` |
| `ACCOUNTS_OIDC_CLIENT_SECRET` | ○ | | |
| `ACCOUNTS_OIDC_REDIRECT_URI` | | `${CLIENT_URL}/api/v1/auth/oidc/callback` | 손님 등록값과 같아야 한다 |
| `ACCOUNTS_OIDC_POST_LOGOUT_REDIRECT_URI` | | `${CLIENT_URL}/` | |
| `ACCOUNTS_OIDC_ACCOUNT_URL` | | 없음 | 계정 화면의 accounts 링크 |
| `ACCOUNTS_OIDC_LANGS` | | `ko` | `lang` 으로 받을 값 목록(RLidea `ko,en,ja`). weaver2 에 언어를 박지 않는다 |
| `ACCOUNTS_OIDC_FAILURE_URLS` | | `admin=/login` | 입구별 실패 주소 JSON 또는 `입구=경로` 목록. RLidea: `admin=/login,site=/{lang}/account/sign-in/` |
| `ACCOUNTS_OIDC_DEFAULT_NEXT` | | `/dashboard` | RLidea `/ko/account/` |

운영 · staging 서버에서 R5 가 더할 것은 **`AUTH_MODE=sso` 와 `ACCOUNTS_OIDC_LANGS` · `ACCOUNTS_OIDC_FAILURE_URLS` · `ACCOUNTS_OIDC_DEFAULT_NEXT` · `ACCOUNTS_OIDC_ACCOUNT_URL`** 뿐이다. redirect · post_logout 은 그 서버의 `CLIENT_URL` 에서 나온다.

## 결정

| # | 무엇 | 결정과 이유 |
|---|---|---|
| D1 | 흐름 | `○` Authorization Code + PKCE S256, `client_secret_basic`. 범위 `openid email profile` — **`offline_access` 는 청하지 않는다**(RLidea 는 자기 세션을 갖고, offline 토큰은 accounts 로그아웃 뒤에도 산다). accounts access 토큰은 userinfo 한 번에만 쓰고 저장하지 않는다. **id_token 도 저장하지 않는다**(D8) |
| D2 | 시작 · tx 쿠키 | `○` `GET /v1/auth/oidc/start?entry=<admin|site>&next=<경로>&lang=<ACCOUNTS_OIDC_LANGS 중 하나>` (`@Public`, 스로틀 10/분). `entry` 는 실패 주소 표(`ACCOUNTS_OIDC_FAILURE_URLS`)의 열쇠만 받는다 — 주소를 받지 않으므로 열린 리다이렉트가 아니다. `state` · `nonce` · `code_verifier` 는 32바이트 무작위. tx = `{state, nonce, verifier, next, lang, entry}` 를 HS256 JWT(`aud: 'oidc-tx'`, 10분)로 서명하되 **키는 `JWT_SECRET` 에서 HKDF 로 따로 뽑는다** — `hkdfSync('sha256', JWT_SECRET, '', 'weaver2/oidc-tx/v1', 32)`(선례 `core/auth/one-time-code/one-time-code.crypto.ts:10`). 쿠키 이름은 운영 **`__Host-oidc_tx`**(Secure · `path=/` · Domain 없음 — staging 이 형제 서브도메인이라 Domain 쿠키가 섞일 틈을 막는다), 개발은 `oidc_tx`. httpOnly · `SameSite=Lax`(콜백은 accounts 에서 오는 최상위 GET). authorize 에 `ui_locales=lang` |
| D3 | `next` | `○` 입구마다 **지금 규칙을 그대로** 쓴다. 집 계정 화면은 `safeNext`(`features/account/lib/next-path.ts`)로 거른 값을 `sessionStorage rl_next` 에 적고(`rememberNext`), start 에는 `entry=site&next=/{lang}/account/oauth/` — 돌아오면 기존 `OAuthReturnView` 가 표시 쿠키 → 약관(sso 면 빈 목록) → 적어 둔 곳을 그대로 한다. 관리 `/login` 은 `safeRedirectPath` 로 거른 `?redirect=` 를 `entry=admin&next=` 로. **백엔드도 한 번 더 거른다 — `login-form.tsx:30-46` 의 「가짜 출처」 방법 그대로**: `const base = 'http://same-origin.invalid'; const url = new URL(value, base); url.origin === base ? path+search+hash : 기본값`. 접두어 검사가 아니라 파싱 뒤 출처 비교라서 `//evil` · `/\tevil` · `\evil` 이 모두 다른 출처가 되어 떨어진다 |
| D4 | 콜백 검사 순서 | `○` `GET /v1/auth/oidc/callback` (`@Public`, GET 이라 CSRF 미들웨어 밖 — `security.middleware.ts:58`). ① tx 쿠키가 있고 서명 · 만료가 맞다 ② `state` 가 같다(`timingSafeEqual`) — **맞을 때만 tx 쿠키를 지운다**(남이 엉터리 state 로 진행 중인 로그인을 끊지 못하게, `oauth.controller.ts` 와 같은 규칙) ③ 응답 `iss` 가 `ACCOUNTS_OIDC_ISSUER` 와 같다 — 안내판이 `authorization_response_iss_parameter_supported: true` 라 **없으면 거절**(mix-up) ④ `error` 면 실패 주소로(`access_denied` → `sso_cancelled`) ⑤ code 교환 ⑥ id_token 검증(D5) ⑦ userinfo, `userinfo.sub === id_token.sub` ⑧ 찾기/만들기(D6) ⑨ 세션(D7). 실패 주소는 tx 의 `entry` 와 `lang` 으로 고르고, tx 를 못 읽으면 `admin` 이 아니라 표의 첫 `site` → 없으면 `admin` |
| D5 | id_token 검증 · 바깥 호출 | `○` `alg` 은 `RS256` 만(`none` · HS 거절), `kid` 로 키를 고름. `iss` · `aud`(여럿이면 `azp`) · `exp` · `iat` 는 **시계 허용 60초** · `nonce === tx.nonce`. JWKS 10분 캐시, **모르는 kid 면 한 번 다시 받기 — 60초에 한 번**. 안내판은 처음 쓸 때 받아 1시간 캐시하고 **`issuer` 가 `ACCOUNTS_OIDC_ISSUER` 와 다르면 쓰지 않는다**. accounts 로 가는 **모든 요청에 `AbortSignal.timeout(5000)`** — 시간이 넘거나 닿지 않으면 `sso_unavailable`. 안내판 실패는 로그인만 실패시키고 부팅은 막지 않는다. UA 는 정하지 않는다(Q7) |
| D6 | 사람 찾기 · 만들기 — **자동 잇기 없음** (Q12) | `○` ① `ssoSubject = sub` 인 행 → 탈퇴면 `account_deleted`. `email_verified=true` 이고 이메일이 다르면 맞춘다(Q4) — `email` 과 함께 `emailVerifiedAt = now`. 다른 살아 있는 행이 그 주소를 쓰면 건너뛰고 경고(로그인은 됨) ② 모르는 `sub` 인데 `normalizeEmail(userinfo.email)` 과 같은 이메일의 행이 있으면(탈퇴 행은 이메일이 익명화돼 걸리지 않는다) → **`sso_conflict`**. 잇지 않는다. 파생 훅 `onConflict(userId, sub)` 를 부른다(RLidea: `AuthEvent SSO_CONFLICT`). 앱 로그에는 `sub` 와 그 행의 id 만(이메일 없음). 화면 문구: 「이 이메일로 된 rlidea.app 계정이 이미 있습니다. 운영자에게 연결을 요청하세요」 ③ 모르는 `sub` · 같은 이메일 없음 · `email_verified=false` → `sso_email_unverified`(Q2) ④ 그 밖 → 새로 만든다: `ssoSubject` · `email` · **`emailVerifiedAt = now`** · `locale = lang` · 이름(훅 `names`, 기본은 weaver2 이름 생성기를 `utils/user-naming.ts` 로 옮겨 씀). `LocalCredential` · 약관 행 없음. 만드는 중 **P2002**(`email` 이나 `ssoSubject` 경합)면 ①부터 **한 번만** 다시 찾는다 |
| D7 | 세션 | `○` `SignInCompletionService.completeExternal(userId, ctx, res)` 를 더한다 — `decide(userId, { twoFactorPassed: true })` 와 같다. **로컬 2FA 를 묻지 않는다**(accounts 가 했다). 탈퇴 · 정지 검사는 그대로. provider `'oidc'`, **`rememberMe=false`(7일, `sign-in.service.ts:105`)**. 콜백에 들어온 요청에 이미 `refresh_token` 쿠키가 있으면 **그 행을 먼저 지운다**(다른 사람의 세션이 열린 브라우저에서 바뀐 사람으로 들어올 때 앞 세션 행을 남기지 않게. 같은 사람이어도 지우고 새로 준다 — 갈래를 두지 않는다). ⚠ accounts 는 `amr` 을 주지 않는다(accounts 명세 H3) — accounts 의 인증을 믿는다 |
| D8 | 로그아웃 | `○` `POST /v1/auth/sign-out`(그대로 CSRF)은 refresh 행 · 쿠키를 **먼저** 지우고, sso 면 `{ endSessionUrl }` 을 돌려준다 = `end_session_endpoint?client_id=…&post_logout_redirect_uri=…&state=<무작위>`. **`id_token_hint` 는 보내지 않는다** — oidc-provider 9.12.2 는 `client_id` 만으로 손님을 찾고 `post_logout_redirect_uri` 를 그 손님의 등록값과 대조한다(`lib/actions/end_session.js:29, 62-63`). hint 를 보내면 만료를 무시하고 검증하므로(`lib/models/id_token.js:259` `ignoreExpiration: true`) 보내도 되지만, 그러려면 id_token 을 세션마다 쥐고 있어야 한다 — 그 값어치가 없다. 화면은 받은 주소로 문서 이동한다. **사람이 보는 순서**: rlidea.app 세션이 이미 끝남 → accounts 「RLidea 계정에서 로그아웃할까요?」 → 「로그아웃」이면 accounts 도 끝나고 `https://rlidea.app/` 로, 「RLidea 계정 로그인 유지」면 accounts 로그인만 남고 돌아온다. 어느 쪽이든 rlidea.app 은 이미 로그아웃이다. 다른 사이트 세션은 남는다(back-channel 없음) |
| D9 | 이메일 신뢰 · 결제 권리 | `○` `isEmailTrusted`(`features/account/utils/email-trust.ts:23-29`)에 첫 갈래: **`ssoSubject` 가 있으면 `emailVerifiedAt !== null` 만 본다.** `emailVerifiedAt` 은 D6 이 만들 때와 이메일을 맞출 때 `now` 로 쓴다. `EMAIL_TRUST_SELECT` 에 `ssoSubject`. 로그인 뒤 훅(D11)이 `claimIfTrusted(userId)` 를 부른다 |
| D10 | `AUTH_MODE` | `○` 「설정 이름」 표. `sso` 인데 필수 셋이 비면 부팅을 멈춘다(조용히 local 로 넘어가지 않는다). `@LocalAuthOnly()` 는 sso 에서 `404 AUTH_MODE_SSO`, `@SsoOnly()`(start · callback)는 local 에서 404. 전역 가드(`AuthModeGuard`)가 메타데이터만 본다. 프런트는 `GET /v1/auth/providers` 의 `sso` 로 안다(빌드 변수 없음) |
| D11 | 파생 훅 | `○` `OIDC_USER_HOOKS`(지금의 `AUTH_PROVIDER_EXTRAS` · `USER_WITHDRAWAL_HOOKS` 모양): `{ names?(claims), afterSignIn?(userId, meta), onConflict?(userId, sub, meta), onLink?(userId, sub) }`. 훅이 던져도 로그인은 실패하지 않는다(경고 로그). RLidea: `names` = `account-names.ts`, `afterSignIn` = `claimIfTrusted` + `AuthEvent LOGIN`, `onConflict` = `AuthEvent SSO_CONFLICT`, `onLink`(CLI 가 부름) = `AuthEvent SSO_LINK` |
| D12 | 탈퇴 · 잇기 풀기 | `○` weaver2 `SoftDeleteUserCommand` 가 `ssoSubject` 도 비운다 — 탈퇴 뒤 같은 신원이 다시 오면 새 RLidea 계정(이메일도 익명화됨). RLidea 탈퇴는 accounts 신원을 남긴다(계정 화면 안내 한 줄). 운영자 손: `pnpm sso:link` · `pnpm sso:unlink`(W2, 아래 「운영자 손」) |
| D13 | 실패 오류 값 | `○` `sso_failed` · `sso_cancelled` · `sso_unavailable` · `sso_email_unverified` · `sso_conflict` · `account_suspended` · `account_deleted` |
| D14 | 여러 탭 | `○` tx 쿠키는 하나다. 두 탭에서 거의 같이 로그인을 시작하면 **먼저 시작한 탭의 콜백이 `sso_failed`** 가 된다(state 가 뒤 탭 것으로 덮임). 오류 화면의 단추로 다시 하면 된다. state 해시로 쿠키를 여러 개 두는 길은 쿠키가 쌓이고 지우는 규칙이 늘어 택하지 않는다 |
| D15 | 전환 때 열린 세션 | `○` 전환(R5)에서 **모든 refresh 행을 지운다.** 사람은 주인님 하나이고 SSO 로 다시 들어온다. access 쿠키는 15분 안에 끝난다. 남겨 두면 local 때 받은 세션이 SSO 를 거치지 않고 30일 산다 |

## 운영자 손 — `sso:link` · `sso:unlink` (W2)

- `pnpm sso:link --email <주소> --sub <accounts users.id> [--apply]` — 기본은 미리보기. 확인: RLidea 행이 **딱 하나**(정규화 이메일, 탈퇴 아님) · 그 행의 `ssoSubject` 가 null 이거나 이미 같은 `sub`(같으면 「이미 이어짐」, 아무것도 안 함 — 멱등) · 다른 행이 그 `sub` 를 쥐지 않음 · `sub` 가 uuid 모양. `--apply` 면 `updateMany({ where: { id, ssoSubject: null } })` 하고 `onLink` 훅(RLidea `AuthEvent SSO_LINK`). accounts 쪽 확인(이메일 · 인증 여부)은 이 스크립트가 할 수 없으므로 **R5.1 의 accounts 조회 결과를 사람이 대조한 뒤에만** `--apply` 한다
- `pnpm sso:unlink --email <주소> [--apply]` — **누가 accounts 신원을 지우고 다시 만들었을 때**(새 `sub`). `ssoSubject = null` + 그 사람의 refresh 행 삭제. 그다음 새 `sub` 로 `sso:link`. 순서: ① 그 사람이 로그인하면 `sso_conflict` 가 나고 `AuthEvent SSO_CONFLICT` 가 남는다(누구 행인지 보임) ② accounts 운영자에게 새 `users.id` 와 이메일 · 인증 여부를 받는다 ③ `sso:unlink --apply` ④ `sso:link --sub <새 id> --apply` ⑤ 그 사람이 다시 로그인
- 둘 다 서버에서 `seed.prod` 처럼 릴리스 안의 묶음으로 돈다(로컬에 운영 DB 비밀을 두지 않는다)

## 지금 있는 것 (2026-10-19 실측, weaver2 경로)

| 사실 | 자리 |
|---|---|
| 모든 로그인의 끝 — 탈퇴 → 2FA(pre-auth) → 정지 → 세션. `decide(twoFactorPassed)` 공개 | `apps/core-backend/src/core/auth/services/sign-in-completion.service.ts:120-145` |
| `rememberMe` 30일 / 7일 | `core/auth/services/sign-in.service.ts:105` |
| OAuth 콜백 — state 쿠키, 맞을 때만 지움, 실패는 `?error=` 로 바꿔 실음 | `core/auth/controllers/oauth.controller.ts` |
| OAuth 는 같은 이메일에 자동으로 잇지 않는다(Conflict) — 이 계획도 같은 태도 | `core/auth/oauth/oauth.service.ts:204-210` |
| Apple id_token 검증(RS256 · JWKS · `createPublicKey`), 모르는 kid 면 다시 받음(제한 없음) | `core/auth/oauth/providers/apple.provider.ts:156-257` |
| `JWT_SECRET` 에서 HKDF 로 따로 키를 뽑는 선례 | `core/auth/one-time-code/one-time-code.crypto.ts:10` |
| 공급자 응답에 `password: true` 가 박혀 있다 | `oauth.service.ts:85` |
| 비밀번호 없는 사람에게 「비밀번호 찾기」는 아무것도 안 하고 성공처럼 답한다 | `core/auth/services/request-password-reset.service.ts:25-28` |
| 로그아웃 = refresh 행 삭제 + 쿠키 삭제, `@Public` + CSRF | `core/auth/controllers/sign-out.controller.ts` |
| `User` 에 외부 신원 칸이 없다 | `prisma/schema/auth.prisma:5-55` |
| GET · HEAD · OPTIONS 는 CSRF 밖 | `libs/common/src/global/middleware/security.middleware.ts:58` |
| **`@Public` 비-GET 경로 전수**(데코레이터 묶음 파싱, 2026-10-19): `auth/sign-in` · `auth/refresh` · `auth/sign-out` · `auth/sign-up/email` · `auth/verify` · `auth/verify/resend` · `auth/password/request-reset` · `auth/password/reset` · `auth/2fa/authenticate` · `auth/2fa/email/send` · `DELETE auth/2fa/pending` · `POST auth/oauth/:provider/callback` · `POST posts` · `POST comments` · (RLidea) `auth/sign-up` · `auth/email/start` · `auth/email/verify` · `app/auth/{sign-in,email/start,email/verify,2fa,2fa/email/send,refresh,exchange}` · `billing/polar/checkout` · `webhooks/polar` · `analytics/tracking/{page-view,bulk-page-views}`(클래스 단 `@Public`) | 각 컨트롤러 |
| 지금 route-guard 시험은 「`@Public` 이 아니면 토큰 없이 401」만 잰다 | `test/integration/route-guard-coverage.integration.spec.ts:5` |
| 관리 로그인 `LoginForm`, `safeRedirectPath` 의 가짜 출처 방법 | `packages/auth/src/components/login-form.tsx:30-46` |
| Playwright 프로젝트는 `chromium` 하나 | `apps/core-frontend/playwright.config.ts:38` |

## 파일 지도 (weaver2)

| 단계 | 파일 | 맡는 일 |
|---|---|---|
| W1 | `[W]` `core/auth/auth-mode.ts` · `guards/auth-mode.guard.ts` · `decorators/{local-auth-only,sso-only}.decorator.ts` (새) | `AUTH_MODE` · 부팅 검사 · 404 가드 |
| W1 | `[W]` `controllers/{sign-in,sign-up,password-reset,two-factor,oauth}.controller.ts` · `core/user/controllers/user-profile.controller.ts` (데코레이터만) | 로컬 전용 표시 |
| W1 | `[W]` `oauth/oauth.service.ts` · `dto/auth-providers-response.dto.ts` | `sso` · `accountUrl` |
| W1 | `[W]` `test/integration/public-write-routes.integration.spec.ts` (새) · `src/core/auth/public-write-allowlist.ts` (새) | 공개 쓰기 경로 전수 (M3) |
| W1 | `[W]` `system/admin/view/**` · `assets/admin/admin-login.html` | sso 안내 (Q8) |
| W2 | `[W]` `prisma/schema/auth.prisma` · 마이그레이션 · `core/user/repositories/soft-delete-user.command.ts` · `scripts/sso-link.ts` · `sso-unlink.ts` (새) · `package.json` | `ssoSubject` · 운영자 손 |
| W3 | `[W]` `core/auth/oidc/{oidc-client,oidc-config,jwks-cache}.ts` (새) · `test/helpers/fake-oidc-issuer.ts` (새) | 손님 핵심 · Jest 가짜 발급자 |
| W4 | `[W]` `core/auth/oidc/{oidc.controller,oidc-transaction,oidc-subject.service,oidc-user-hooks,oidc.module}.ts` (새) · `services/sign-in-completion.service.ts` · `controllers/sign-out.controller.ts` · `utils/user-naming.ts` (옮김) · `test/integration/oidc-login.integration.spec.ts` (새) | start · callback · 세션 · 로그아웃 |
| W5 | `[W]` `packages/auth/src/{components/login-form.tsx,hooks/use-logout.ts,api/auth.api.ts}` · `app/(protected)/settings/security/page.tsx` · `app/(auth)/{sign-up,forgot-password}/page.tsx` | 프런트 |
| W5 | `[W]` `scripts/fake-oidc-issuer.ts` (새) · `scripts/lane.sh` · `apps/core-frontend/playwright.config.ts` · `.github/workflows/ci.yml` · `e2e/auth-sso.spec.ts` (새) · 로컬 SSO 안내 (새) | e2e · 로컬 개발 |

## Tasks

### weaver2 몫 (W1~W5)

#### Task W1 — `AUTH_MODE` · 로컬 전용 경로 · 공개 쓰기 경로 전수 (TDD)
- [ ] 실패하는 단위 시험 먼저 — `auth-mode.guard.spec.ts`: local 에서 `@SsoOnly` → 404, sso 에서 `@LocalAuthOnly` → 404 `AUTH_MODE_SSO`, 표시 없음 → 통과. `auth-mode.spec.ts`: 값 없음 → local, `sso` 인데 `ACCOUNTS_OIDC_ISSUER` · `_CLIENT_ID` · `_CLIENT_SECRET` 중 하나 빔 → 던짐, 엉뚱한 값 → 던짐, redirect · post_logout 기본값이 `CLIENT_URL` 에서 나옴
- [ ] 로컬 전용 표시: `auth/sign-in` · `sign-up/email` · `verify` · `verify/resend` · `password/*` · `2fa/*`(전부) · `oauth/*`(전부) · `users/me/password` · `users/me/email` · `users/me/email/confirm`. 남는 것: `auth/refresh` · `auth/sign-out` · `auth/sessions` · `auth/providers` · `csrf` · `users/me` GET · PATCH · DELETE
- [ ] **공개 쓰기 경로 전수 시험(M3)** — `public-write-routes.integration.spec.ts`: `route-guard-coverage` 처럼 라우트를 메타데이터에서 스스로 모은다. sso 로 앱을 띄우고 **`@Public` 이고 GET 이 아닌 모든 경로**가 ⓐ `public-write-allowlist.ts` 에 있거나 ⓑ 404 `AUTH_MODE_SSO` 인지 본다. 목록에 없는 새 공개 쓰기 경로가 생기면 이 시험이 빨개진다. weaver2 허용 목록(실측): `POST auth/refresh` · `POST auth/sign-out` · `POST posts` · `POST comments`(게시판 쓰기 — 익명 허용 여부는 게시판 권한이 판정) · `analytics/tracking/*`. 파생 프로젝트는 같은 파일의 확장 자리(`PUBLIC_WRITE_ALLOWLIST_EXTRAS` 토큰)로 더한다
- [ ] `GET /v1/auth/providers`: `{ ...extras, sso, password: !sso, google: !sso && …, …, accountUrl? }`
- [ ] 정적 관리 뷰(Q8): sso 면 `/admin/login` 이 로그인 칸 대신 「관리 화면은 `${CLIENT_URL}/login` 에서」 한 줄
- [ ] 받아들임: `pnpm test:core` · `pnpm test:integration` 초록, local 에서 동작 변화 0(`route-guard-coverage` 그대로)

#### Task W2 — `User.ssoSubject` · 운영자 손
- [ ] `auth.prisma` `User` 에 `ssoSubject String? @unique` (주석: 「accounts 의 sub. 이 칸으로만 찾는다 — 이메일로 저절로 잇지 않는다」). `prisma migrate dev --name user_sso_subject` 는 weaver2 격리 레인 DB 에서
- [ ] `SoftDeleteUserCommand` 가 `ssoSubject: null` 을 함께 쓴다 (D12). 단위 시험
- [ ] `scripts/sso-link.ts` · `sso-unlink.ts`(「운영자 손」). 시험 — 순수 함수 `planLink(rows, email, sub)`: 행 없음 → 멈춤 · 둘 → 멈춤 · 탈퇴 행 → 멈춤 · 이미 같은 sub → 「이미 이어짐」 · 다른 sub → 멈춤(먼저 unlink) · 다른 행이 sub 를 쥠 → 멈춤 · uuid 아님 → 멈춤 · 정상 → link. `--apply` 없이는 쓰지 않는다
- [ ] 서버 실행 입구: `build-seed.cjs` 처럼 릴리스에 묶고 `deploy.sh --sso-link` 대신 서버에서 `node dist/scripts/sso-link.js` 로(파생 프로젝트 배포 틀에 맞춰 weaver2 문서에 적음)
- [ ] 받아들임: `pnpm db:generate` · `pnpm typecheck` · 시험 초록

#### Task W3 — OIDC 손님 핵심 (TDD, 가짜 발급자)
- [ ] **스파이크 (Q1)** — `openid-client@6` 를 넣고 관문 다섯: `pnpm test:core` · `pnpm test:integration` · `pnpm typecheck:core` · `nest build` · Node 24 에서 `node dist/main.js` 가 뜨고 `import` 가 풀림. 하나라도 막히면 (b) — `apple.provider.ts:156-257` 을 바탕으로 `jwks-cache.ts` 를 짓고 모르는 kid 다시 받기에 60초 제한. 결과를 계획에 한 줄
- [ ] `test/helpers/fake-oidc-issuer.ts`: `node:http` 를 임의 포트에, `crypto.generateKeyPairSync('rsa')`. 안내판 · `/jwks` · `/token`(Basic · S256 · `redirect_uri`, code 1회용) · `/me`(Bearer) · `/session/end`. id_token 서명은 `node:crypto` 로 직접(JWS 세 조각) — ESM 의존 없음. 손잡이: `issueCode({sub, email, email_verified, nonce, challenge})` · 틀린 iss · aud · nonce · 만료 · `alg none`/HS256 · 모르는 kid · 키 회전 · 안내판 `issuer` 다름 · userinfo `sub` 다름 · **응답 지연(6초)**. (a)면 시험에서만 `allowInsecureRequests`
- [ ] `oidc-client.spec.ts` (실패 먼저): 맞는 토큰 → claims · 틀린 iss/aud/nonce · 만료 61초 → 거절, 59초 어긋남 → 통과 · `alg none`/HS256 → 거절 · 모르는 kid → 한 번 다시 받고 통과, 60초 안 두 번째 → 다시 받지 않고 거절 · 안내판 issuer 다름 → 거절 · userinfo sub 다름 → 거절 · token 400 → 거절(비밀 · 본문이 메시지에 없음) · 6초 지연 → `sso_unavailable`(5초 시간 제한)
- [ ] `OidcClient` 포트: `authorizationUrl` · `exchange` · `verifyIdToken` · `userinfo` · `endSessionUrl({ state })`. **UA 를 정하지 않는다**(Q7)
- [ ] 받아들임: 위 시험이 네트워크를 쓰지 않고 통과, 비밀 · 이메일이 로그에 없음(logger 스파이)

#### Task W4 — start · callback · 찾기/만들기 · 세션 · 로그아웃 (TDD, 통합)
- [ ] 실패하는 통합 시험 먼저 — `oidc-login.integration.spec.ts` (`AUTH_MODE=sso`, 가짜 발급자, 사람은 시험 안에서 만든다):
  - start → authorize 302, `code_challenge_method=S256`, `ui_locales`, tx 쿠키 httpOnly · `SameSite=Lax`. 운영 설정이면 이름이 `__Host-oidc_tx` · Secure · Domain 없음 · `path=/`. `lang` 이 목록 밖 → 첫 값, `entry` 가 표 밖 → `admin`
  - 정상 콜백 → `access_token` · `refresh_token`(7일), tx 쿠키 지움, Location = next
  - `next=//evil.com` · `https://evil.com` · `/\tevil.com` · `\evil.com` → 기본 next
  - state 다름 → 실패 주소, tx **남음** · tx 없음 → 실패(`admin` 실패 주소) · `iss` 없음 · 다름 → 실패 · `error=access_denied` → `sso_cancelled` · 실패 주소는 `entry=site&lang=ja` 면 `/ja/account/sign-in/?error=…`
  - 같은 code 두 번 → 두 번째 실패 · 같은 tx 로 두 번째 콜백 → 실패(nonce)
  - **찾기/만들기(D6):** `sub` 있는 행 → 그 행 · 모르는 `sub` + 같은 이메일 행(대소문자만 다름 포함) → **`sso_conflict`, 행의 `ssoSubject` 그대로 null**, `onConflict` 불림 · 모르는 `sub` + 같은 이메일 없음 + verified → 새 행(`emailVerifiedAt` 있음, `LocalCredential` 없음) · + unverified → `sso_email_unverified` · 이어진 사람 + unverified → 로그인됨, 이메일 그대로 · 만드는 중 P2002(시험에서 같은 sub 를 동시에 두 번) → 둘 다 같은 행으로 로그인
  - 이메일 맞추기: 이어진 사람의 이메일이 바뀜 + verified → 바뀜 + `emailVerifiedAt` 갱신 · 다른 행이 씀 → 안 바뀜, 로그인됨
  - 탈퇴 → `account_deleted` · 정지 → `account_suspended` · TOTP 켠 사람 → pre-auth 없이 세션
  - **이미 열린 세션:** A 의 `refresh_token` 쿠키를 단 채 B 로 콜백 → A 의 refresh 행이 지워짐, B 세션
  - 로그아웃: 응답이 refresh 행 · 쿠키를 지운 **뒤** `endSessionUrl` = `client_id` · `post_logout_redirect_uri` · `state`, `id_token_hint` 없음
  - local 모드: start · callback 404, sign-out 응답에 `endSessionUrl` 없음
- [ ] 구현: `OidcTransaction`(HKDF 키 · 쿠키 이름 · 읽기 · 지우기), `OidcSubjectService`(D6, 훅), `OidcController`, `completeExternal`(D7), sign-out `endSessionUrl`(D8), `utils/user-naming.ts`
- [ ] `@Throttle` start 10/분 · callback 20/분 · `pnpm openapi:types`
- [ ] 받아들임: 통합 초록(레인 DB), `pnpm test:core` 초록

#### Task W5 — 프런트 · e2e · 로컬 SSO
- [ ] `LoginForm`: `sso` 면 「SSO 로 로그인」 단추 하나 — `href=/api/v1/auth/oidc/start?entry=admin&next=<safeRedirectPath>`. `?error=sso_*` 문구. vitest
- [ ] `useLogout`: `endSessionUrl` 이 있으면 `window.location.assign`
- [ ] `settings/security`: sso 면 비밀번호 · 2FA · 소셜 칸 숨김, `accountUrl` 링크, 세션 목록은 둔다. `(auth)/sign-up` · `forgot-password` 는 sso 면 안내 + 단추
- [ ] `scripts/fake-oidc-issuer.ts`: W3 도우미를 독립 서버로(`tsx`). authorize 는 이메일 칸 하나짜리 폼(+ 「email_verified 끄기」 칸). end_session 은 `post_logout_redirect_uri?state=` 로 302. **포트는 레인 백엔드 포트에서 뽑는다 — `4180 + (API 포트 − 4000)`**: 런타임 레인 4180, 격리 레인 4190~4199(4100 은 로컬 accounts 몫)
- [ ] `lane.sh`: `lane:e2e <레인> --sso` 가 가짜 발급자를 함께 켜고 **trap 으로 함께 내린다**, 백엔드에 `AUTH_MODE=sso` · `ACCOUNTS_OIDC_*`(가짜 값)을 넘긴다
- [ ] **Playwright 프로젝트 둘(M4)**: `chromium`(기존) 에 `testIgnore: /sso.*\.spec\.ts$/`, 새 `sso` 프로젝트는 `testMatch: /sso.*\.spec\.ts$/` — `auth-sso.spec.ts` 와 RLidea `account-sso.rlidea.spec.ts` 가 함께 잡힌다. `lane:e2e --sso` 는 `--project=sso`, 그냥 `lane:e2e` 는 `--project=chromium`. 런타임 `test.skip` 없음
- [ ] `e2e/auth-sso.spec.ts`: `/login?redirect=/admin` → 단추 → 가짜 authorize → `/admin` · 로그아웃 → 가짜 end_session → `/`
- [ ] `ci.yml`(Q9): e2e 잡 끝에 `e2e-sso` — 같은 빌드, 백엔드만 sso 로 다시 켜고 `--project=sso` **전체**. `pull_request:` 의 `main` 은 건드리지 않는다
- [ ] 로컬 SSO 안내 문서 — 아래 「로컬 개발 SSO」 + **되돌리기 함정**: sso 로 생긴 사람은 `LocalCredential` 이 없다. local 로 되돌리면 「비밀번호 찾기」는 아무 메일도 보내지 않고 성공처럼 답한다(`request-password-reset.service.ts:25-28`). **weaver2 만으로는 그 사람이 잠긴다** — 파생 프로젝트에 이메일 코드 로그인 같은 길이 없으면 운영자가 비밀번호를 정해 줘야 한다
- [ ] 받아들임: `pnpm test:web` · `pnpm lane:e2e <레인> --sso` 초록, `pnpm lane:e2e <레인>` 이 local 로 그대로 초록

## 로컬 개발 SSO — 개발자 · 레인이 로그인하는 길

> **2026-10-19 accounts 답으로 바뀜:** 로컬 accounts 는 `127.0.0.1:4100` 하나(손님 `rlidea-app-local` · 비밀 `local-dev-secret` · redirect 는 백엔드 직접 `localhost:4000 · 4010~4019/v1/auth/oidc/callback`), 아래 표의 3100 · 프런트 경유 redirect 는 낡았다. 정본은 `docs/handbook/11-sso.md` 「로컬 accounts」. 계정 링크는 `ACCOUNTS_OIDC_ACCOUNT_URL`(예 `https://accounts.rlidea.com/account`), 보안 화면 `${accountUrl}/security` 를 새 탭으로.

**기본은 그대로 `AUTH_MODE=local` 이다** — 개발 서버 · 편집 레인 · 격리 레인 · CI 모두. 운영 accounts 에는 localhost 손님이 없다. SSO 를 봐야 할 때만:

| 길 | 언제 | 어떻게 |
|---|---|---|
| **가짜 발급자** (권장) | e2e · 레인에서 SSO 화면을 볼 때 | `pnpm lane:e2e <레인> --sso …` 가 켜고 내린다. 손으로 보려면 런타임 레인에서 `tsx scripts/fake-oidc-issuer.ts`(4180) + 백엔드 `.env` 에 `AUTH_MODE=sso` · `ACCOUNTS_OIDC_ISSUER=http://localhost:4180` · `ACCOUNTS_OIDC_CLIENT_ID=local` · `ACCOUNTS_OIDC_CLIENT_SECRET=local`. 가짜 authorize 는 이메일 칸 하나 |
| **로컬 accounts** | 진짜 `oidc-provider` 와 맞물리는지(end_session · 약관 · 2FA) | accounts.rlidea 를 **프런트 3100 · 백엔드 4100** 으로(두 저장소 기본 3000/4000 이 겹치고, 3001~3009 는 이웃, 3010~3019 · 4010~4019 · 4180~4199 는 레인 몫). issuer `http://127.0.0.1:3100/oidc`. accounts `OIDC_CLIENTS` 에 `rlidea-app-local` — redirect `http://localhost:3000/api/v1/auth/oidc/callback` 과 3010~3019 열 개. `ACCOUNTS_OIDC_ISSUER` 를 그 issuer 로 |

- ⚠ 로컬 accounts + rlidea.app 은 풀스택 두 벌이다 — 런타임 레인 하나에서만, 끝나면 내린다
- ⚠ 쿠키는 포트를 가르지 않는다. 둘 다 `localhost` 면 `access_token` 이 서로를 덮는다 → 로컬 accounts 는 `127.0.0.1:3100`, rlidea.app 은 `localhost:3000` 으로 호스트를 가른다
- ⚠ 개발에서는 tx 쿠키가 `__Host-` 가 아니다(Secure 가 아니라서) — 운영 이름은 시험이 잰다

## 보안 점검표 (리뷰어가 이 표로 본다)

| 위협 | 막는 곳 |
|---|---|
| 열린 리다이렉트 | D3 — 입구 화면의 기존 규칙 + 백엔드 가짜 출처 재검사. 실패 주소는 `entry` 열쇠로만(D2) |
| 콜백 CSRF · 로그인 CSRF | D2 · D4 — state 를 HKDF 키로 서명한 tx 쿠키와 대조, `__Host-` |
| 재사용 | nonce 를 tx 에 묶고 성공 때 tx 를 지운다. code 1회용, PKCE |
| mix-up | D4 ③ — `iss` 응답 매개변수 필수 + id_token `iss` + 안내판 `issuer` 대조(D5) |
| 시계 어긋남 | D5 — 60초. R5.5 에서 `timedatectl` |
| JWKS 회전 | D5 — 모르는 kid 면 한 번, 60초에 한 번 |
| 서명 바꿔치기 | D5 — RS256 만 |
| accounts 가 느림 · 죽음 | D5 — 5초 시간 제한, `sso_unavailable` |
| 비밀 유출 | `.env`(mode 600)만 · 로그 금지 · token 응답 본문을 오류에 싣지 않음 |
| 계정 탈취(이메일 잇기) | D6 — **자동 잇기 없음.** 겹치면 `sso_conflict` + 사건 기록, 잇기는 운영자 CLI 만 |
| 앞사람 세션 | D7 — 콜백 때 들어온 refresh 행을 지움 · D15 전환 때 모두 지움 · Q6 로그아웃이 accounts 까지 |
| 닫힌 경로가 열려 있음 | W1 · R4 — 공개 쓰기 경로 전수 시험 |
| 2FA 우회 | D7 — accounts 의 2FA 를 믿는다(accounts 는 2FA 켠 사람을 2FA 화면에 거침) |

## 이 계획 밖

- RLidea 몫(R1~R5) — 이메일 신뢰 · 약관 문 · 앱 직접 로그인 닫기 · 인증 사건 · 집 계정 화면 · 운영 전환. RLidea 계획을 본다
- 로컬 로그인 코드 · 화면 · 메일 템플릿 · 약관 화면 지우기 (Q11)
- DrawMark 를 accounts 의 네이티브 공개 손님으로(accounts 명세 △) — handoff 는 RLidea 에 남는다
- back-channel logout 받기 — accounts 가 지으면 `sid` 를 세션에 남기는 일과 함께 정한다
- accounts 탈퇴 알림 받기
- 처리방침 · 이용약관 문구(Q3)
- `prompt=login` · `max_age` 재인증(accounts H3)
- 소셜 로그인 — accounts L4 · Naver `emailVerified` 가 먼저다
