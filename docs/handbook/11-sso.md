# 11. SSO 손님 모드 — `AUTH_MODE=sso`

> 웹 로그인을 바깥 OIDC 발급자(RLidea 에서는 accounts.rlidea.com)에 맡기는 모드. 콜백이 끝나면 **지금과 같은 세션 쿠키**(`access_token` · `refresh_token`)를 주므로 쿠키 뒤의 앱은 바뀌지 않는다.
> 결정과 이유는 [`docs/design/plans/2026-10-19-sso-client-mode.md`](../design/plans/2026-10-19-sso-client-mode.md). 이 장은 쓰는 법이다.

## 한눈에 보기

```
/login 「SSO 로 로그인」
  → GET /v1/auth/oidc/start?entry=admin&next=/admin        tx 쿠키(oidc_tx, 10분)
  → 발급자 /auth (로그인 · 약관 · 2FA 는 발급자가)
  → GET /v1/auth/oidc/callback?code&state&iss               state · iss · code · id_token · userinfo
  → ssoSubject 로 사람 찾기/만들기 → 세션 쿠키 → 302 next
```

| 조각 | 자리 |
|---|---|
| 설정 읽기 · 부팅 검사 | `apps/core-backend/src/core/auth/auth-mode.ts` |
| `@LocalAuthOnly()` · `@SsoOnly()` · 404 가드 | `core/auth/decorators/` · `core/auth/guards/auth-mode.guard.ts` |
| 발급자와 말하는 포트(openid-client) | `core/auth/oidc/oidc-client.ts` |
| start · callback | `core/auth/oidc/oidc.controller.ts` |
| tx 쿠키 | `core/auth/oidc/oidc-transaction.ts` |
| 사람 찾기/만들기 | `core/auth/oidc/oidc-subject.service.ts` |
| 파생 훅 | `core/auth/oidc/oidc-user-hooks.ts` (`OIDC_USER_HOOKS`) |
| 공개 쓰기 허용 목록 | `core/auth/public-write-allowlist.ts` (`PUBLIC_WRITE_ALLOWLIST_EXTRAS`) |
| 운영자 손 | `core/auth/oidc/sso-link.ts` · `apps/core-backend/scripts/sso-link.ts` |

## 설정

| 이름 | 필수 (sso) | 기본 | 뜻 |
|---|---|---|---|
| `AUTH_MODE` | — | `local` | `local` · `sso`. 그 밖이면 부팅이 멈춘다 |
| `ACCOUNTS_OIDC_ISSUER` | ○ | | 안내판의 `issuer` 와 글자까지 같아야 한다. https — 평문 http 는 localhost 만 |
| `ACCOUNTS_OIDC_CLIENT_ID` | ○ | | |
| `ACCOUNTS_OIDC_CLIENT_SECRET` | ○ | | 로그 · 오류 메시지에 나오지 않는다 |
| `ACCOUNTS_OIDC_REDIRECT_URI` | | `${CLIENT_URL}/api/v1/auth/oidc/callback` | 발급자에 등록한 값과 같아야 한다 |
| `ACCOUNTS_OIDC_POST_LOGOUT_REDIRECT_URI` | | `${CLIENT_URL}/` | |
| `ACCOUNTS_OIDC_ACCOUNT_URL` | | 없음 | 보안 설정 화면의 「계정 서버에서 관리하기」 링크 |
| `ACCOUNTS_OIDC_LANGS` | | `ko` | start 의 `lang` 으로 받을 값. 첫 값이 기본 |
| `ACCOUNTS_OIDC_FAILURE_URLS` | | `admin=/login` | 입구별 실패 주소(같은 출처의 경로, `{lang}` 가능). `입구=경로,…` 또는 JSON |
| `ACCOUNTS_OIDC_DEFAULT_NEXT` | | `/dashboard` | `next` 가 없거나 다른 출처일 때 |

`OIDC_*`(접두어 없음)는 **공급자** 쪽(oidc-provider 를 띄우는 파생 프로젝트)의 이름이다. 손님은 `ACCOUNTS_OIDC_*` 다.

## 계약 — 파생 프로젝트가 기대는 것

- **경로**: `GET /v1/auth/oidc/start?entry=&next=&lang=` · `GET /v1/auth/oidc/callback` (둘 다 `@Public` · `@SsoOnly`, 스로틀 10/분 · 20/분)
- **공급자 응답** `GET /v1/auth/providers`: `{ sso, password: !sso, google · kakao · naver · apple: !sso && …, accountUrl? }`
- **로그아웃** `POST /v1/auth/sign-out`: refresh 행 · 쿠키를 먼저 지우고, sso 면 `{ endSessionUrl }` = `end_session?client_id&post_logout_redirect_uri&state` (id_token_hint 없음). 화면은 그리로 문서 이동한다(`useLogout`). 발급자에 닿지 못하면 칸만 빠지고 로그아웃은 성공이다
- **실패 코드**(실패 주소의 `?error=`): `sso_failed` · `sso_cancelled` · `sso_unavailable` · `sso_email_unverified` · `sso_conflict` · `account_suspended` · `account_deleted`
- **쿠키**: tx 는 운영 `__Host-oidc_tx`(Secure · `path=/` · Domain 없음), 개발 `oidc_tx`. httpOnly · `SameSite=Lax` · 10분. 세션 쿠키는 그대로(`rememberMe=false` → refresh 7일)
- **닫히는 경로**(`@LocalAuthOnly`, sso 에서 404 `AUTH_MODE_SSO`): `auth/sign-in` · `auth/sign-up/email` · `auth/verify` · `auth/verify/resend` · `auth/password/*` · `auth/2fa/*` · `auth/oauth/*` · `users/me/password` · `users/me/email` · `users/me/email/confirm` · 관리 뷰 `admin/request-password-reset` · `admin/reset-password`. 남는 것: `auth/refresh` · `auth/sign-out` · `auth/sessions` · `auth/providers` · `auth/csrf-token` · `users/me` GET · PATCH · DELETE
- **훅** `OIDC_USER_HOOKS`: `{ names?(claims), afterSignIn?(userId, meta), onConflict?(userId, sub, meta), onLink?(userId, sub), onUnlink?(userId, sub) }`. 던져도 로그인 · 잇기는 실패하지 않는다. `meta` = `{ sub, created, lang, entry, ipAddress?, userAgent? }` — weaver2 `User` 에는 언어 칸이 없으므로 새 사람의 언어는 `afterSignIn` 의 `meta.created` · `meta.lang` 으로 파생 프로젝트가 정한다
- **허용 목록 확장** `PUBLIC_WRITE_ALLOWLIST_EXTRAS`: 문자열 배열(`'POST /v1/…'`, `:이름` 한 마디). `public-write-routes.integration.spec.ts` 가 앱의 모든 `@Public` 비-GET 경로를 「목록에 있거나 404」로 잰다
- **세션**: `SignInCompletionService.completeExternal(userId, ctx, res)` — 로컬 2FA 를 묻지 않고 탈퇴 · 정지는 본다. 콜백 요청에 이미 refresh 쿠키가 있으면 그 행을 먼저 지운다

## 사람 — sub 로만 찾는다

- `User.ssoSubject`(unique)로만 찾는다. **이메일로 저절로 잇지 않는다** — 모르는 sub 인데 같은 이메일의 살아 있는 행이 있으면 `sso_conflict`(`onConflict` 훅, 로그에는 sub 와 행 id 만)
- 모르는 sub · 같은 이메일 없음 · 이메일 미인증 → `sso_email_unverified`. 인증됐으면 새로 만든다(`emailVerifiedAt = now`, `LocalCredential` · 약관 행 없음)
- 이어진 사람의 이메일이 발급자에서 바뀌고 인증돼 있으면 맞춘다(다른 행이 쓰면 건너뛴다)
- 탈퇴하면 `ssoSubject` 를 비운다. ⚠ weaver2 는 탈퇴 때 이메일을 익명화하지 않으므로, 같은 신원이 다시 오면 그 이메일을 쥔 탈퇴 행 때문에 `account_deleted` 가 된다. 파생 프로젝트가 `USER_WITHDRAWAL_HOOKS` 로 이메일을 익명화하면 새 계정이 된다

## 운영자 손 — 이미 있는 행을 잇기

```bash
pnpm sso:link   --email <주소> --sub <발급자 users.id>   # 미리보기
pnpm sso:link   --email <주소> --sub <발급자 users.id> --apply
pnpm sso:unlink --email <주소> [--apply]                 # 신원을 새로 만든 사람 — 세션도 지운다
```

- 잇기 전에 발급자 쪽에서 그 sub 의 이메일 · 인증 여부를 **사람이 대조한다**. 스크립트는 발급자를 보지 못한다
- 몇 번 돌려도 같다(이미 이어졌으면 아무것도 안 함). 멈추는 경우: 행 없음 · 둘 이상 · 탈퇴 행 · 다른 sub 에 이어짐(먼저 unlink) · 다른 행이 그 sub 를 쥠 · sub 가 uuid 모양이 아님
- 앱 모듈을 띄워 `OIDC_USER_HOOKS.onLink` · `onUnlink` 까지 부른다(파생 프로젝트의 인증 사건 기록)
- 운영 서버에서는 그 서버의 릴리스 디렉터리에서 `pnpm sso:link …` 로 돈다(서버의 `.env` = 운영 DB). 로컬에 운영 DB 비밀을 두지 않는다. 파생 프로젝트의 배포 틀이 dev 의존성(ts-node)을 빼고 배포한다면, 그 틀의 시드 번들처럼 이 스크립트도 릴리스에 묶는다

## 로컬 개발 · e2e

**기본은 `AUTH_MODE=local`이다** — 개발 서버 · 편집 레인 · 격리 레인 · CI 모두. SSO 를 봐야 할 때만:

| 길 | 언제 | 어떻게 |
|---|---|---|
| **가짜 발급자** (권장) | e2e · 레인에서 SSO 화면을 볼 때 | `pnpm lane:e2e <레인> --sso` 가 켜고 내린다. 손으로 보려면 `pnpm exec tsx scripts/fake-oidc-issuer.ts`(4280) + 백엔드 `.env` 에 `AUTH_MODE=sso` · `ACCOUNTS_OIDC_ISSUER=http://127.0.0.1:4280/oidc` · `ACCOUNTS_OIDC_CLIENT_ID=local` · `ACCOUNTS_OIDC_CLIENT_SECRET=local`. 가짜 로그인 화면은 이메일 칸 하나(+ 「email_verified 끄기」), sub 는 이메일에서 늘 같게 나온다 |
| **로컬 accounts** | 진짜 oidc-provider 와 맞물리는지(end_session 확인 화면 · 약관 · 2FA) | accounts 를 프런트 3100 · 백엔드 4100 으로. issuer `http://127.0.0.1:3100/oidc`. accounts 의 `OIDC_CLIENTS` 에 이 앱의 redirect(`http://localhost:3000/api/v1/auth/oidc/callback` 과 레인 3010~3019)를 등록한다 |

- 가짜 발급자 포트는 `4280 + (백엔드 포트 − 4000)`: 런타임 레인 4280, 격리 레인 4290~4299. 4100 은 로컬 accounts 몫. 계획의 4180 대역은 쓰지 않는다 — 4190 이 Fetch 표준의 「bad port」라 Node fetch 가 `fetch failed (bad port)` 로 거절한다
- Playwright 프로젝트가 둘이다 — `chromium`(local, `*sso*.spec.ts` 를 뺀다) · `sso`(`*sso*.spec.ts` 만). `lane:e2e` 는 `--project=chromium`, `lane:e2e --sso` 는 `--project=sso`. CI 는 `dev`→`main` PR 의 e2e 잡이 둘 다 돈다(「E2E (SSO)」 단계)
- ⚠ 쿠키는 포트를 가르지 않는다. 로컬 accounts 와 이 앱이 둘 다 `localhost` 면 `access_token` 이 서로를 덮는다 → accounts 는 `127.0.0.1:3100`, 이 앱은 `localhost:3000`
- ⚠ 개발에서는 tx 쿠키가 `__Host-` 가 아니다(Secure 가 아니라서). 운영 이름은 `oidc-transaction.spec.ts` 가 잰다

## 되돌리기 — 함정 하나

`.env` 의 `AUTH_MODE=local` → 재시작. 마이그레이션(`ssoSubject`)은 그대로 둔다.

⚠ **SSO 로 새로 생긴 사람은 `LocalCredential` 이 없다.** local 로 되돌리면 그 사람의 「비밀번호 찾기」는 아무 메일도 보내지 않고 성공처럼 답한다(`request-password-reset.service.ts` — 비밀번호 없는 계정을 드러내지 않으려는 동작). **weaver2 만으로는 그 사람이 잠긴다.** 파생 프로젝트에 이메일 코드 로그인 같은 다른 길이 없으면 운영자가 비밀번호를 정해 줘야 한다. 되돌리기 전에 `select count(*) from users where "ssoSubject" is not null and id not in (select "userId" from local_credentials)` 로 몇 명인지 본다.
