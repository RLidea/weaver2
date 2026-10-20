# 11. SSO 손님 모드 — `AUTH_MODE=sso`

> 웹 로그인을 바깥 OIDC 발급자(RLidea 에서는 accounts.rlidea.com)에 맡기는 모드. 콜백이 끝나면 **지금과 같은 세션 쿠키**(`access_token` · `refresh_token`)를 주므로 쿠키 뒤의 앱은 바뀌지 않는다.
> 결정과 이유는 [`docs/design/plans/2026-10-19-sso-client-mode.md`](../design/plans/2026-10-19-sso-client-mode.md). 이 장은 쓰는 법이다.

## 한눈에 보기

```
/login 「SSO 로 로그인」
  → GET /v1/auth/oidc/start?entry=admin&next=/admin        tx 쿠키(oidc_tx, 10분)
  → 발급자 /auth (로그인 · 약관 · 2FA 는 발급자가)
  → GET /v1/auth/oidc/callback?code&state&iss               state · iss · code · id_token · userinfo
  → ssoSubject 로 사람 찾기/만들기 → 세션 쿠키(refresh 행에 id_token 의 sid) → 302 next

발급자에서 로그아웃 (다른 탭 · 다른 손님 · 탈퇴)
  → 발급자가 서버에서 POST /v1/auth/oidc/backchannel-logout  logout_token(서명)
  → 그 sid 의 refresh 행을 지움 → 200
```

| 조각 | 자리 |
|---|---|
| 설정 읽기 · 부팅 검사 | `apps/core-backend/src/core/auth/auth-mode.ts` |
| `@LocalAuthOnly()` · `@SsoOnly()` · 404 가드 | `core/auth/decorators/` · `core/auth/guards/auth-mode.guard.ts` |
| 발급자와 말하는 포트(openid-client) | `core/auth/oidc/oidc-client.ts` |
| start · callback · back-channel 로그아웃 | `core/auth/oidc/oidc.controller.ts` |
| logout_token 검증(§2.6) · 세션 지우기 | `core/auth/oidc/oidc-logout-token.ts` · `oidc-client.ts`(`verifyLogoutToken`) · `backchannel-logout.service.ts` |
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
| `ACCOUNTS_OIDC_ACCOUNT_URL` | | 없음 | 계정 서버의 계정 화면(예 `https://accounts.rlidea.com/account`). https 만(평문 http 는 localhost 만 — 아니면 부팅이 멈춘다). 보안 설정 화면은 `${accountUrl}/security` 를 **새 탭**으로 연다 — 계정 서버에는 돌아오는 단추가 없다 |
| `ACCOUNTS_OIDC_LANGS` | | `ko` | start 의 `lang` 으로 받을 값. 첫 값이 기본 |
| `ACCOUNTS_OIDC_FAILURE_URLS` | | `admin=/login` | 입구별 실패 주소(같은 출처의 경로, `{lang}` 가능). `입구=경로,…` 또는 JSON |
| `ACCOUNTS_OIDC_DEFAULT_NEXT` | | `/dashboard` | `next` 가 없거나 다른 출처일 때 |

`OIDC_*`(접두어 없음)는 **공급자** 쪽(oidc-provider 를 띄우는 파생 프로젝트)의 이름이다. 손님은 `ACCOUNTS_OIDC_*` 다.

## 계약 — 파생 프로젝트가 기대는 것

- **경로**: `GET /v1/auth/oidc/start?entry=&next=&lang=` · `GET /v1/auth/oidc/callback` · `POST /v1/auth/oidc/backchannel-logout` (모두 `@Public` · `@SsoOnly`, 스로틀 30/분 · 30/분 · 120/분 — start · callback 이 걸리면 429 JSON 대신 실패 주소에 `sso_busy`). local 이면 셋 다 404 `AUTH_MODE_LOCAL`
- **back-channel 로그아웃** `POST /v1/auth/oidc/backchannel-logout`: 아래 「back-channel 로그아웃」
- **공급자 응답** `GET /v1/auth/providers`: `{ sso, password: !sso, google · kakao · naver · apple: !sso && …, accountUrl? }`
- **로그아웃** `POST /v1/auth/sign-out`: refresh 행 · 쿠키를 먼저 지우고, sso 면 응답 `data.endSessionUrl` = `end_session?client_id&post_logout_redirect_uri&state` (id_token_hint 없음). 화면은 그리로 문서 이동한다(`useLogout`). 발급자에 닿지 못하면 칸만 빠지고 로그아웃은 성공이다. RLidea accounts 는 거기서 「어디에서 로그아웃할까요?」를 묻는다 — 「RLidea 서비스 전부 로그아웃」(accounts 로그인도 끝내고 다른 손님에게 back-channel 을 보낸다) · 「{client_name}만 로그아웃」(accounts 로그인은 남는다). 어느 쪽이든 이 앱 세션은 이미 끝났고 `post_logout_redirect_uri` 로 돌아온다. 가짜 발급자는 묻지 않고 바로 돌려보낸다 — e2e 는 그 문구에 기대지 않는다
- **실패 코드**(실패 주소의 `?error=`): `sso_failed` · `sso_cancelled` · `sso_unavailable` · `sso_busy`(start · callback 스로틀 — 잠시 뒤 다시) · `sso_email_unverified` · `sso_conflict` · `account_suspended` · `account_deleted`
- **쿠키**: tx 는 콜백(redirect URI)이 https 면 `__Host-oidc_tx`(Secure · `path=/` · Domain 없음), http 면 `oidc_tx` — NODE_ENV 가 아니라 콜백의 scheme 으로 정한다. httpOnly · `SameSite=Lax` · 10분. 세션 쿠키는 그대로(`rememberMe=false` → refresh 7일)
- **닫히는 경로**(`@LocalAuthOnly`, sso 에서 404 `AUTH_MODE_SSO`): `auth/sign-in` · `auth/sign-up/email` · `auth/verify` · `auth/verify/resend` · `auth/password/*` · `auth/2fa/*` · `auth/oauth/*` · `users/me/password` · `users/me/email` · `users/me/email/confirm` · 관리 뷰 `admin/request-password-reset` · `admin/reset-password`. 가드(`AuthModeGuard`)는 인증 다음에 돈다 — 공개 경로는 404, 로그인이 필요한 경로(`users/me/password` 등)는 로그인 전 401 · 뒤 404, API 토큰은 범위 없는 경로에서 늘 401 그대로. 남는 것: `auth/refresh` · `auth/sign-out` · `auth/sessions` · `auth/providers` · `auth/csrf-token` · `users/me` GET · PATCH · DELETE
- **훅** `OIDC_USER_HOOKS`: `{ names?(claims), afterSignIn?(userId, meta), onConflict?(userId, sub, meta), onLink?(userId, sub), onUnlink?(userId, sub), onBackchannelLogout?(userId | null, { sid?, sub?, scope }) }`. 던져도 로그인 · 잇기는 실패하지 않고, 훅마다 3초(`OIDC_HOOK_TIMEOUT_MS`)까지만 기다린다. 훅은 **멱등**이고 쓰기는 **트랜잭션 하나**로 — 시간을 넘긴 훅은 뒤에서 계속 돌고 되돌려지지 않는다. `sso:link` · `sso:unlink` 에서는 시간을 넘긴 훅이 도는 중에 `app.close()` 가 Prisma 연결을 닫을 수 있다(기록이 빠지면 다시 돌린다). **`onConflict` 는 기록 전용** — `ssoSubject` 를 쓰거나 행을 이으면 안 된다(잇기는 `sso:link` 로만). `claims` = `{ sub, email?, email_verified, name?, preferred_username? }`(OIDC 클레임 이름 그대로), `meta` = `{ sub, created, lang, entry, ip?, country?, userAgent? }`(`country` 는 `cf-ipcountry` 헤더 — Cloudflare 뒤일 때만, 기록용) — weaver2 `User` 에는 언어 칸이 없으므로 새 사람의 언어는 `afterSignIn` 의 `meta.created` · `meta.lang` 으로 파생 프로젝트가 정한다
- **허용 목록 확장** `PUBLIC_WRITE_ALLOWLIST_EXTRAS`: 문자열 배열(`'POST /v1/…'`, `:이름` 한 마디). `public-write-routes.integration.spec.ts` 가 앱의 모든 `@Public` 비-GET 경로를 「목록에 있거나 404」로 잰다
- **세션**: `SignInCompletionService.completeExternal(userId, ctx, res)` — 로컬 2FA 를 묻지 않고 탈퇴 · 정지는 본다. 콜백 요청에 이미 refresh 쿠키가 있으면 그 행을 먼저 지운다. `ctx.oidcSid`(id_token 의 sid)를 refresh 행의 `oidcSid` 에 남기고, refresh 회전이 새 행으로 옮긴다
- **CSRF 면제**: `security.middleware.ts` 의 `SERVER_TO_SERVER_PATHS` — `POST /v1/auth/oidc/backchannel-logout` 하나, 방법과 경로가 글자까지 같을 때만(끝 빗금 · 접두어는 면제되지 않는다)

## back-channel 로그아웃 — 발급자가 서버로 알린다

OpenID Connect Back-Channel Logout 1.0 의 손님 쪽. 사람이 발급자 쪽에서 로그아웃하면(어느 손님에서든 「RLidea 서비스 전부 로그아웃」 · accounts 계정 화면의 로그아웃 · 「연결된 서비스」에서 이 서비스 로그아웃 · 탈퇴) 발급자가 그 세션의 sid 를 실은 `logout_token` 을 서버에서 서버로 보내고, 이 앱은 그 sid 로 받은 세션(refresh 행)을 지운다. 발급자가 **sid 없이 sub 만** 실어 보내면 「이 사람의 세션을 전부 끊어라」는 뜻이고, 이 앱은 그 사람의 refresh 행을 모두(앱 · 기기 행까지) 지운다. accounts.rlidea.com 은 이렇게 가른다 (2026-10-20):

| 발급자 쪽 동작 | 오는 신호 |
|---|---|
| 「RLidea 서비스 전부 로그아웃」(로그아웃 화면 · end_session) | 세션마다 sid — 앱은 남는다 |
| 「다른 세션 모두 종료」 · 비밀번호 변경 | 「다른 기기 · 앱에서도 로그아웃」(기본 체크)을 켜면 sub 만, 끄면 다른 세션에만 sid |
| 비밀번호 재설정 · 탈퇴 · 정지 | 늘 sub 만 |

sub 만 오는 신호는 발급자 설정 `OIDC_BACKCHANNEL_SUB_ONLY_CLIENTS` 에 든 손님에게만 간다.

**발급자에 등록할 것**

| 칸 | 값 |
|---|---|
| `backchannel_logout_uri` | `${CLIENT_URL}/api/v1/auth/oidc/backchannel-logout` — `/api` 는 프런트 프록시가 떼는 머리다. 백엔드 경로는 `/v1/auth/oidc/backchannel-logout`. 백엔드에 직접 닿는 주소를 주어도 된다 |
| `backchannel_logout_session_required` | **`true`** — id_token 에 sid 가 실린다. 그래도 발급자는 사람 단위의 끊기(위 표)에 sub 만 온 logout_token 을 보낼 수 있고, 이 앱은 그것을 받는다. 예전 `ACCOUNTS_OIDC_BACKCHANNEL_SESSION_REQUIRED` 는 2026-10-20 에 뺐다 — `.env` 에 남아 있으면 부팅 때 경고만 하고 읽지 않는다 |

**받는 것과 답**

- 몸통: `application/x-www-form-urlencoded` 의 `logout_token`. 쿠키 · Origin · CSRF 토큰 없음
- 검증(§2.6): 먼저 **네트워크 없이** 머리만 본다 — JWS 가 아니거나 `alg` ≠ RS256 · `typ` ≠ `logout+jwt` 면 발급자에 묻지 않고 400. 그다음 RS256 만 · 발급자 JWKS(kid, 모르는 kid 면 다시 받되 30초에 한 번) · 머리 `typ` = `logout+jwt` · `iss` = 설정한 발급자 · `aud` 에 client_id · `iat` 있음(시계 허용 60초, 10분보다 오래면 거절) · `exp` 있으면 지나지 않음 · `events` 에 `http://schemas.openid.net/event/backchannel-logout`(값은 객체) · `nonce` 없음 · `sid` 나 `sub`(둘 다 없으면 400) · `jti` 한 번만
- `200`(몸통 없음, `Cache-Control: no-store`) — 지울 세션이 없어도(이미 로그아웃 · 만료 · 모르는 sid)
- `400 {"error":"invalid_request"}` — 위 검증에 걸림 · 같은 jti 다시 옴 · `logout_token` 없음. 로그에는 걸린 규칙만 남고 토큰은 남지 않는다
- `503 {"error":"temporarily_unavailable"}` — 발급자의 안내판 · JWKS 에 닿지 못함(토큰 탓이 아니다). 안내판을 못 받으면 30초 동안은 다시 묻지 않고 같은 실패를 돌려준다(로그인 start 도 같다)
- 발급자는 2.5초 안의 200 · 204 만 성공으로 보고, 그 밖은 1 · 2 · 4 … 분 뒤 **새로 서명한 토큰**으로 하루 동안 다시 보낸다 — 그래서 400 · 503 · 429 도 결국 닿는다
- 스로틀 120/분(IP) — 발급자 한 곳이 모든 사람의 로그아웃을 한 IP 로 보내므로 넉넉하게. 프록시 뒤면 `TRUST_PROXY` (아래)

**지우는 것**

- `sid` → `refresh_tokens.oidcSid = sid` 인 행 전부(회전한 행 포함) — `sub` 도 왔으면 그 행 주인의 `ssoSubject = sub` 인 것만. `sid` 없이 `sub` 만 → `ssoSubject = sub` 인 사람의 refresh 행 **전부**(sid 없는 행 — 파생 프로젝트의 앱 · 기기 행까지), 그리고 `users.sessionsRevokedAt = 지금`(그보다 먼저 만든 행은 경합한 회전이 남겨도 회전하지 못한다). 이 끊기는 warn 로그로 남는다 — 평소 로그아웃마다 보이면 발급자 등록이 `backchannel_logout_session_required: false` 다
- **회전과 줄 서기**: 로그아웃 트랜잭션은 세션 주인의 `users` 행을 잠그고(`SELECT … FOR UPDATE`), refresh 회전도 한 트랜잭션에서 같은 행을 잠근다 — 회전이 지우기 사이에 끼어 끝난 sid 로 새 행을 남기지 못한다. 둘째 문으로 sid 묘비(`oidc_revoked_sids`, 31일 = rememberMe 30일 + 회전의 올림 하루)를 남기고, 회전은 묘비에 걸린 행 · `sessionsRevokedAt` 보다 먼저 만든 행을 지우고 401 이다. 회전의 마킹은 `rotatedAt IS NULL` 일 때만이라 같은 쿠키로 동시에 두 번 refresh 해도 새 행은 하나다
- 🔴 **잠금 순서는 `users` → `refresh_tokens`** — 한 트랜잭션에서 refresh 행을 지우거나 고치는 곳은 **첫 문장으로** `LockUsersCommand(tx, [userId])` 를 부른다(탈퇴 `delete-account.service.ts` · 관리자 삭제 `user-admin.service.ts` · 비밀번호 재설정 `reset-password.service.ts` 가 그렇게 한다). 거꾸로 하면 회전 · back-channel 로그아웃과 서로를 기다리며 교착한다. **파생 프로젝트의 탈퇴 훅(`USER_WITHDRAWAL_HOOKS`)** 은 탈퇴 트랜잭션 안에서 돌고 그 트랜잭션은 이미 `users` 를 잠갔다 — 훅이 다른 사람의 refresh 행을 지우려면 그 사람도 먼저 잠근다
- `sessionsRevokedAt` 과 `refresh_tokens.createdAt` 은 같은 시계(앱 프로세스)다 — Prisma 는 `@default(now())` 를 클라이언트에서 채워 INSERT 에 싣는다. 백엔드를 여러 기계에 띄우면 NTP 로 시계를 맞춘다
- jti 는 `oidc_logout_jtis` 에 iat + 10분 + 60초 + 60초까지 두고, 다음 요청 때 지난 jti · 묘비를 지운다. jti 기록 · 묘비 · 세션 지우기는 한 트랜잭션이다 — 지우기가 실패하면 jti 도 남지 않아 재시도가 닿는다
- **이미 내 준 access 토큰도 다음 요청에서 막힌다** — JWT 는 지울 수 없으므로 검증(`JwtStrategy`)에서 거절한다. sub 끊기는 `iat` 가 `sessionsRevokedAt` 의 초보다 앞인 토큰(끊은 바로 그 초에 받은 토큰은 통과 — 끊은 뒤 곧바로 다시 로그인한 토큰을 살리려고 받아들인 1초 미만의 창이다. `iat` 없는 토큰은 거절), sid 끊기는 토큰에 실린 `sid` 클레임(SSO 로그인과 그 회전 때만 싣는다)의 묘비가 살아 있으면. 이미 읽는 사용자 행을 보므로 sid 없는 토큰은 조회가 늘지 않고, sid 있는 토큰만 묘비를 PK 로 하나 더 읽는다. 이 기능 전에 받은 토큰에는 sid 가 없어 sid 끊기에는 만료(`JWT_EXPIRES_IN`)까지 산다
- 훅 `onBackchannelLogout(userId | null, { sid, sub, scope })` 는 200 을 보낸 **뒤에** 불린다. `scope` 는 `'session'`(sid 가 왔다 — 그 세션 하나) 또는 `'subject'`(sub 만 왔다 — 그 사람 전부) — 기록에서 둘을 가를 때 쓴다 — 발급자의 2.5초를 쓰지 않는다. 시간 한도 · 멱등 규칙은 다른 훅과 같다 — **같은 로그아웃이 두 번 올 수 있다**(첫 응답이 늦으면 발급자가 새 jti 로 다시 보낸다). userId 는 지운 세션의 주인, 없으면 sub 로 찾은 사람, 그것도 없으면 null

**닿지 않는 세션은 없다** — 이 앱의 SSO 세션은 7일(`rememberMe=false`)이고 발급자의 OIDC 세션은 14일이다. 발급자는 자기가 아는 OIDC 세션의 sid 로 보내므로, 이 앱 세션이 발급자 세션보다 오래 살면 그 세션은 신호를 받지 못한다 — 지금은 늘 짧다. 이 앱 세션을 늘리려면(예 `rememberMe`) 발급자 세션보다 짧게 둔다.

sid 가 생기기 전(이 기능 전)에 만든 SSO 세션은 `oidcSid` 가 비어 있어 back-channel 이 닿지 않는다 — 7일 안에 저절로 끝난다.

## 프록시 뒤 — `TRUST_PROXY` 를 꼭 둔다

start(30/분) · callback(30/분) 스로틀은 IP 마다 센다. 걸리면 429 JSON 이 아니라 실패 주소에 `?error=sso_busy` 로 302 다(문서 이동이라) — local 모드면 실패 주소가 없어 다른 경로와 같은 429 다.
start 는 서명한 짧은 쿠키 하나만 쓰므로 사무실 NAT 를 생각해 넉넉히 두었고, callback 은 start 와 같게 두었다 — 낮으면 발급자에서 로그인을 마치고 돌아와서야 막힌다. callback 의 바깥 호출(code 교환 · userinfo)은 맞는 tx 가 있어야 나가고 tx 는 start 로만 생기므로 그 수는 start 의 한도가 묶는다. Cloudflare · nginx 뒤에서 `TRUST_PROXY` 를 두지 않으면 `req.ip` 가 늘 프록시 주소라 **사이트 전체가 한 통**이 된다 — 한 사람이 1분에 서른 번 누르면 모두의 로그인이 `sso_busy` 로 막힌다. 파생 프로젝트는 운영 `.env` 에 그 서버의 프록시 홉 수나 주소를 `TRUST_PROXY` 로 적는다(`libs/common/src/global/middleware/trust-proxy.ts`). 같은 이유로 훅 `meta.ip` 도 그래야 진짜 사람의 IP 다.

**Cloudflare 뒤 nginx** 면 nginx 도 진짜 IP 를 받아야 한다 — Cloudflare 가 붙인 IP 를 `X-Forwarded-For` 에 실어 넘기려면:

```nginx
# Cloudflare 의 IP 대역 전부 (https://www.cloudflare.com/ips/ — 바뀌면 따라 고친다)
set_real_ip_from 173.245.48.0/20;
# … 나머지 IPv4 · IPv6 대역 …
real_ip_header CF-Connecting-IP;
```

이것이 없으면 nginx 의 `$remote_addr` 가 Cloudflare 의 가장자리 주소라 백엔드에는 그 주소만 오고, **모든 요청이 스로틀 한 통을 나눠 쓴다**(back-channel 120/분도). RLidea 운영 nginx 는 이미 이렇게 한다.

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
| **가짜 발급자** (권장) | e2e · 레인에서 SSO 화면을 볼 때 | `pnpm lane:e2e <레인> --sso` 가 켜고 내린다. 손으로 보려면 `pnpm exec tsx scripts/fake-oidc-issuer.ts`(4280) + 백엔드 `.env` 에 `AUTH_MODE=sso` · `ACCOUNTS_OIDC_ISSUER=http://127.0.0.1:4280/oidc` · `ACCOUNTS_OIDC_CLIENT_ID=local` · `ACCOUNTS_OIDC_CLIENT_SECRET=local`. 가짜 로그인 화면은 이메일 칸 하나(+ 「email_verified 끄기」), sub 는 이메일에서 늘 같게 나온다. back-channel 로그아웃은 `curl -d email=<주소> http://127.0.0.1:4280/oidc/test/backchannel-logout` — 그 사람의 마지막 sid 로 서명해 `http://localhost:<API 포트>/v1/auth/oidc/backchannel-logout` 로 보내고 받은 코드를 돌려준다(`--backchannel-uri` 로 바꾼다) |
| **로컬 accounts** | 진짜 oidc-provider 와 맞물리는지(end_session 확인 화면 · 약관 · 2FA) | 아래 「로컬 accounts」 |

- 가짜 발급자는 쿠키를 하나도 심지 않는다(세션 없이 폼 하나로 code 를 낸다) — 이 앱의 `access_token` · `refresh_token` 을 덮을 일이 없다
- 가짜 발급자 포트는 `4280 + (백엔드 포트 − 4000)`: 런타임 레인 4280, 격리 레인 4290~4299. 4100 은 로컬 accounts 몫. 계획의 4180 대역은 쓰지 않는다 — 4190 이 Fetch 표준의 「bad port」라 Node fetch 가 `fetch failed (bad port)` 로 거절한다
- Playwright 프로젝트가 둘이다 — `chromium`(local, `*sso*.spec.ts` 를 뺀다) · `sso`(`*sso*.spec.ts` 만). `lane:e2e` 는 `--project=chromium`, `lane:e2e --sso` 는 `--project=sso`. CI 는 `dev`→`main` PR 의 e2e 잡이 둘 다 돈다(「E2E (SSO)」 단계)
- ⚠ 쿠키는 포트를 가르지 않는다. 로컬 accounts 와 이 앱이 둘 다 `localhost` 면 `access_token` 이 서로를 덮는다 → accounts 는 `127.0.0.1:4100`, 이 앱은 `localhost` (아래 「로컬 accounts」)
- ⚠ http 콜백(개발 · e2e)에서는 tx 쿠키가 `__Host-` 가 아니다(Secure 를 못 건다). https 이름은 `oidc-transaction.spec.ts` 가 잰다

### 로컬 accounts (실측 전)

RLidea 의 accounts(accounts.rlidea) 는 로컬 손님 하나를 둔다 — 2026-10-19 accounts 답, **아직 이 조합으로 끝까지 돌려 보지 않았다.**

- accounts 를 `PORT=4100` 으로, **`127.0.0.1:4100`** 으로 연다(그 쪽 `CLIENT_URL` 도 `http://127.0.0.1:4100`). 브라우저 쿠키는 포트를 가르지 않는다 — 둘 다 `localhost` 면 accounts 와 이 앱의 `access_token` · `refresh_token` 이 서로를 덮는다. 호스트(`127.0.0.1` 대 `localhost`)로 가른다
- accounts 의 `OIDC_CLIENTS` 에 `rlidea-app-local`(비밀 `local-dev-secret`). 등록된 redirect 는 **백엔드 직접** `http://localhost:4000/v1/auth/oidc/callback` · `http://localhost:4010~4019/v1/auth/oidc/callback`, post_logout 은 `http://localhost:3000/` · `3010~3019`
- back-channel 로그아웃을 로컬에서 보려면 그 손님 줄에 `backchannel_logout_uri: http://localhost:4000/v1/auth/oidc/backchannel-logout`(레인이면 그 백엔드 포트) · `backchannel_logout_session_required: true` 를 더하고, accounts `.env` 에 **`OIDC_BACKCHANNEL_ALLOW_PRIVATE=1`** — 없으면 accounts 가 localhost 같은 사설 주소로는 보내지 않는다(운영에서는 두지 않는다)
- 이 앱의 `.env`: `AUTH_MODE=sso` · `ACCOUNTS_OIDC_ISSUER=http://127.0.0.1:4100/oidc`(accounts 안내판의 issuer 와 글자까지 같게) · `ACCOUNTS_OIDC_CLIENT_ID=rlidea-app-local` · `ACCOUNTS_OIDC_CLIENT_SECRET=local-dev-secret` · `ACCOUNTS_OIDC_REDIRECT_URI=http://localhost:4000/v1/auth/oidc/callback`(백엔드 포트에 맞춰)
- ⚠ 콜백이 백엔드 출처(`:4000`)로 오면 마지막 302 의 `next`(경로)도 백엔드 출처에서 풀린다 — `/admin` 이면 프런트가 아니라 백엔드의 정적 관리 뷰로 간다. 쿠키는 호스트(`localhost`)로 붙어 프런트에도 실리므로 세션은 산다. 프런트로 바로 돌아오려면 accounts 에 프런트 경유 redirect(`http://localhost:3000/api/v1/auth/oidc/callback` · `3010~3019`)를 더해 달라고 하고 `ACCOUNTS_OIDC_REDIRECT_URI` 를 비운다(기본값이 그것이다)

## 되돌리기 — 함정 하나

`.env` 의 `AUTH_MODE=local` → 재시작. 마이그레이션(`ssoSubject` · `refresh_tokens.oidcSid` · `oidc_logout_jtis`)은 그대로 둔다. local 에서는 back-channel 경로가 404 라 발급자의 재시도가 하루 동안 실패하다 그친다 — 발급자 등록에서 `backchannel_logout_uri` 를 빼는 것이 깔끔하다.

⚠ **SSO 로 새로 생긴 사람은 `LocalCredential` 이 없다.** local 로 되돌리면 그 사람의 「비밀번호 찾기」는 아무 메일도 보내지 않고 성공처럼 답한다(`request-password-reset.service.ts` — 비밀번호 없는 계정을 드러내지 않으려는 동작). **weaver2 만으로는 그 사람이 잠긴다.** 파생 프로젝트에 이메일 코드 로그인 같은 다른 길이 없으면 운영자가 비밀번호를 정해 줘야 한다. 되돌리기 전에 `select count(*) from users where "ssoSubject" is not null and id not in (select "userId" from local_credentials)` 로 몇 명인지 본다.
