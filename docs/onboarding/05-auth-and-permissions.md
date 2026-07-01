# 5. 인증과 권한 (Auth & Permissions)

이 장은 weaver2에서 가장 복잡한 두 시스템 — **인증(Authentication)**과 **권한(Authorization)** — 을 다룹니다. 두 개념은 자주 혼동되므로, 먼저 경계를 잡겠습니다.

| 개념 | 질문 | weaver2에서 담당 |
|------|------|-----------------|
| **인증(Auth)** | 당신이 누구인가? | JWT + HttpOnly 쿠키, OAuth, 2FA |
| **권한(Authz)** | 무엇을 할 수 있는가? | PermissionGroup + 와일드카드 |

코드는 모두 `apps/core-backend/src/core/auth/`와 `apps/core-backend/src/core/permission/`에 있습니다.

---

## 5.1 인증 흐름 — JWT + HttpOnly 쿠키

### 토큰 설계

weaver2는 두 종류의 JWT를 씁니다.

| 토큰 | 쿠키 이름 | 만료 | 저장 위치 |
|------|----------|------|----------|
| **Access Token** | `access_token` | `JWT_EXPIRES_IN` (`.env.example` 권장 `15m` / 미설정 시 코드 기본 `1h`) | HttpOnly 쿠키만 |
| **Refresh Token** | `refresh_token` | 7일 (rememberMe 시 최대 30일) | HttpOnly 쿠키 + DB `RefreshToken` 테이블 |

```
// apps/core-backend/.env.example
JWT_EXPIRES_IN=15m
```

주의할 점: 쿠키 `maxAge`는 **15분으로 하드코딩**돼 있고(`sign-in.controller.ts`), JWT 자체의 `expiresIn`은 `JWT_EXPIRES_IN`(미설정 시 코드 기본 `1h` — `core.module.ts`)을 따릅니다. 둘은 별개이며, `.env.example`처럼 `JWT_EXPIRES_IN=15m`으로 맞추면 쿠키 만료와 일치합니다. `setAuthCookies()` 가 두 쿠키를 모두 `httpOnly: true`로 심습니다. JavaScript에서 직접 읽을 수 없어 XSS 탈취를 차단합니다.

```typescript
// apps/core-backend/src/core/auth/controllers/sign-in.controller.ts
res.cookie('access_token', tokens.accessToken, {
  httpOnly: true,
  secure: isProduction,
  path: '/',
  maxAge: 15 * 60 * 1000,   // 15분
});
res.cookie('refresh_token', tokens.refreshToken, {
  httpOnly: true,
  secure: isProduction,
  path: '/',
  maxAge: tokens.tokenExpiry, // 7일 또는 30일 (rememberMe)
});
```

### 토큰 추출 순서

`JwtStrategy`는 토큰을 세 경로에서 순서대로 시도합니다 (`apps/core-backend/src/core/auth/strategy/jwt.strategy.ts`).

```
1순위: HttpOnly 쿠키 access_token   ← 브라우저 기본
2순위: Authorization: Bearer …      ← Swagger UI / API 테스트용 fallback
3순위: ?token=…  (URL 쿼리)         ← SSE 연결 / 모바일 클라이언트 fallback
```

### 토큰 갱신 (Rotation)

`POST /api/v1/auth/refresh` 를 호출하면 쿠키의 `refresh_token`을 읽어 **기존 토큰을 삭제하고 새 토큰을 발급**합니다 (단발 사용 보장). 남은 만료 일수를 그대로 이어받아 새 Refresh Token을 만들기 때문에 `rememberMe`의 유효 기간이 보존됩니다.

```
POST /api/v1/auth/refresh
  ← refresh_token 쿠키 읽기
  → 기존 RefreshToken DB 레코드 삭제
  → 새 Access Token + Refresh Token 발급 & 쿠키 재설정
```

> 📌 **기억할 것**: 탈취된 Refresh Token을 재사용하면 서버가 이미 삭제된 토큰을 거부합니다. DB에 저장하는 이유가 바로 이 무효화 능력입니다.

---

## 5.2 native OAuth — Passport를 쓰지 않는 이유

weaver2는 이메일/비밀번호 인증에는 `passport-local`과 `passport-jwt`를 사용하지만, **소셜 로그인(OAuth)에는 `passport-google-oauth2` 등의 전략 라이브러리를 사용하지 않습니다.** 대신 `OAuthProvider` 인터페이스를 직접 구현한 세 개의 프로바이더를 씁니다.

```
apps/core-backend/src/core/auth/oauth/
├── interfaces/
│   └── oauth-provider.interface.ts   ← 공용 인터페이스
├── providers/
│   ├── google.provider.ts
│   ├── kakao.provider.ts
│   └── naver.provider.ts
├── oauth-provider.registry.ts        ← 이름으로 프로바이더 조회
└── oauth.service.ts                  ← 흐름 오케스트레이션
```

### 인터페이스

```typescript
// apps/core-backend/src/core/auth/oauth/interfaces/oauth-provider.interface.ts
export interface OAuthProvider {
  readonly name: string;
  getAuthorizationUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
  getUserProfile(accessToken: string): Promise<OAuthUserProfile>;
}
```

새 OAuth 제공자를 추가할 때는 이 인터페이스를 구현하고 `OAuthProviderRegistry`에 등록하기만 하면 됩니다.

### OAuth 콜백 흐름

```
브라우저 → GET /api/v1/auth/oauth/:provider
  ← 인가 URL + state 반환 (state는 쿠키에도 저장 → CSRF 방어)

사용자 → 소셜 로그인 완료

소셜 제공자 → GET /api/v1/auth/oauth/:provider/callback?code=...&state=...
  → state 쿠키와 비교 (불일치 시 UnauthorizedException)
  → code 교환 → Access Token 획득 → 프로필 조회
  → findOrCreateUser(): OAuthAccount 조회 → (없으면) 신규 User 생성
  → JWT 쿠키 심기 → OAUTH_SUCCESS_REDIRECT_URL 로 리다이렉트
```

> ⚠️ **이메일 충돌 정책**: 같은 이메일로 이미 가입된 계정이 있을 경우, OAuth 자동 연동을 **차단**합니다. 이메일을 검증하지 않는 제공자가 임의 이메일을 청구할 수 있어 계정 탈취 위험이 있기 때문입니다. 사용자는 기존 계정으로 로그인 후 설정에서 직접 연동해야 합니다. (`oauth.service.ts` `findOrCreateUser()` 참조)

> 💡 **왜 Passport OAuth 전략을 쓰지 않나?** 라이브러리마다 콜백 형식과 프로필 매핑이 달라 디버깅이 어렵고, 프로바이더별 업데이트에 의존하게 됩니다. weaver2는 "블랙박스 의존성보다 직접 구현으로 디버깅 가능성을 택한다"는 `CHARTER.md §5` 원칙에 따라 native로 구현했습니다.

---

## 5.3 2단계 인증 (2FA)

2FA는 **TOTP**(OTP 앱)와 **이메일 OTP** 두 방식을 지원하며, 독립적으로 활성화할 수 있습니다. 관련 코드는 `apps/core-backend/src/core/auth/services/two-factor.service.ts`에 있습니다.

### 로그인 시 2FA 흐름

```
POST /api/v1/auth/sign-in
  → 비밀번호 검증 통과
  → 2FA 활성화 여부 확인
      ┌─ 비활성화 → JWT 쿠키 즉시 발급 (로그인 완료)
      └─ 활성화 → pre-auth 토큰 반환 (5분 유효)

POST /api/v1/auth/2fa/authenticate
  → pre-auth 토큰 + 코드 검증
  → 성공 시 JWT 쿠키 발급 (로그인 완료)
```

**pre-auth 토큰**은 일반 JWT와 구조가 같지만 `type: 'pre-auth'` 필드를 포함합니다. `JwtStrategy.validate()`가 이 타입이면 `null`을 반환하여 일반 인증에 사용되는 것을 차단합니다.

```typescript
// apps/core-backend/src/core/auth/services/two-factor.service.ts
const payload: PreAuthPayload = { sub: userId, type: 'pre-auth', rememberMe };
return this.jwtService.sign(payload, { expiresIn: '5m' });
```

### TOTP 설정 순서

```
1. POST /api/v1/auth/2fa/totp/setup    → secret + QR 코드 URL 반환
2. 사용자가 OTP 앱(Google Authenticator 등)으로 QR 스캔
3. POST /api/v1/auth/2fa/totp/confirm  → OTP 코드 검증 → totpEnabled = true
```

비밀키는 `LocalCredential.totpSecret`에 저장됩니다. `otplib` 라이브러리로 생성·검증합니다.

### 이메일 OTP

6자리 난수를 생성해 bcrypt 해시로 DB(`TwoFactorChallenge`)에 저장하고, 원본 코드를 이메일 발송합니다. 유효 시간은 **10분**입니다.

> 📌 **2FA 비활성화 제한**: 두 방식이 모두 켜진 상태에서만 하나씩 끌 수 있습니다. 마지막 남은 2FA 수단은 비활성화할 수 없습니다(계정 잠금 방지).

---

## 5.4 계정 잠금

이메일/비밀번호 로그인 실패 시 `LocalCredential.failedAttempts`가 증가합니다. 임계값을 초과하면 `lockedUntil`이 설정되어 해당 시각까지 로그인이 차단됩니다.

```
로그인 실패 → IncrementFailedAttemptsCommand
로그인 성공 → ResetFailedAttemptsCommand (카운터 초기화)
잠금 중    → "Account is temporarily locked. Please try again later." (401)
```

계정 정지(`suspendedUntil`)는 별도 필드로 관리됩니다. 잠금보다 먼저 체크합니다.

관련 파일: `apps/core-backend/src/core/auth/services/sign-in.service.ts`

---

## 5.5 권한 시스템 — PermissionGroup + 와일드카드

### 왜 Role이 아닌 PermissionGroup인가?

전통적인 RBAC(Role-Based Access Control)에서 "관리자"는 하나의 역할에 고정된 권한 묶음을 갖습니다. weaver2는 대신 **AWS IAM과 유사한 방식**을 씁니다.

- 사용자는 **여러 PermissionGroup**에 속할 수 있습니다.
- 각 그룹은 권한 문자열의 목록을 가집니다.
- 권한 문자열은 `resource:action` 또는 `resource:action:scope` 형식입니다.
- **와일드카드**(`resource:*`, `*:*`)로 묶음 허용이 가능합니다.

이 구조 덕분에 "게시글 관리만 가능한 외부 에디터" 같은 맞춤형 그룹을 Role 추가 없이 만들 수 있습니다.

### 시드 6종 그룹

`pnpm db:seed` 실행 시 `permission-group.seed.ts`가 아래 6개 그룹을 생성합니다.

| 그룹 | 핵심 권한 | 설명 |
|------|----------|------|
| **SuperAdmin** | `*:*` | 전체 권한. 와일드카드 하나로 모든 체크 통과 |
| **Admin** | `admin:*`, `post:*`, `board:*`, `user:*` 등 | 시스템 운영 전반. 사용자 삭제 권한 없음 |
| **Operator** | `admin:access`, `post:delete:all`, `user:suspend` 등 | 콘텐츠 삭제 + 유저 정지 가능 |
| **Moderator** | `moderation:content:hide`, `moderation:user:warn` 등 | 중재 전담. 정지·삭제 불가 |
| **User** | `post:create`, `post:update:own`, `comment:create` 등 | 일반 가입 사용자 |
| **Suspended** | (권한 없음) | 정지된 계정. 가드에서 사실상 전부 차단 |

파일 경로: `apps/core-backend/prisma/seed/permission-group.seed.ts`

### 와일드카드 해소 순서

`PermissionService.hasPermission()`은 세 단계로 체크합니다 (`apps/core-backend/src/core/permission/services/permission.service.ts`).

```
1. *:*       → SuperAdmin 체크 → true이면 즉시 허용
2. resource:* → 해당 리소스 전체 체크 → true이면 허용
3. 정확한 문자열 → 일치 여부 체크
```

예: 사용자가 `board:*`를 갖고 있으면 `board:create` 요청이 2단계에서 통과됩니다.

### 권한 캐시

DB 조회를 매 요청마다 하면 부담이 큽니다. `PermissionService`는 LRU 인메모리 캐시를 내장합니다.

| 환경변수 | 기본값 | 설명 |
|----------|--------|------|
| `PERMISSION_CACHE_STRATEGY` | `memory` | `memory` 또는 `none` |
| `PERMISSION_CACHE_TTL` | `300` (초) | 캐시 유효 시간 |
| `PERMISSION_CACHE_MAX_SIZE` | `1000` | 최대 캐시 항목 수 (초과 시 가장 오래된 것 제거) |

> ⚠️ **트러블슈팅 — 권한을 바꿨는데 반영이 안 돼요**: 캐시 TTL(기본 5분) 안에 권한을 변경하면 즉시 반영되지 않습니다. `PermissionService.invalidateCache(userId)` 또는 `invalidateAllCache()`를 호출하거나, 개발 중에는 `PERMISSION_CACHE_STRATEGY=none`으로 설정하세요.

---

## 5.6 `libs/shared`의 `PERMISSIONS` 상수 — 백·프론트 공유

권한 문자열은 문자열 리터럴(`'post:create'`)을 코드 여기저기에 직접 쓰면 오타가 생기고 리팩터링이 어렵습니다. weaver2는 `PERMISSIONS` 상수와 `hasPermission()` 함수를 **프레임워크 의존성 없는 순수 TypeScript**로 `libs/shared`에 정의하고, 백엔드와 프론트엔드가 공통으로 import합니다.

```typescript
// libs/shared/src/index.ts
export const PERMISSIONS = {
  POST: {
    CREATE: 'post:create',
    UPDATE_OWN: 'post:update:own',
    UPDATE_ALL: 'post:update:all',
    ALL: 'post:*',
    // ...
  },
  SUPER: '*:*',
} as const;

// 프론트엔드에서도 그대로 쓸 수 있는 순수 함수
export function hasPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.some(
    (p) => p === required || p === PERMISSIONS.SUPER || p === required.split(':')[0] + ':*',
  );
}
```

백엔드 시드(`permission-group.seed.ts`)가 `@weaver2/common/constants/permissions.const`를 import하고, 프론트엔드가 `@weaver2/shared`를 import해 **권한 문자열의 진실이 한 곳에만 존재**합니다. 1장에서 모노레포를 택한 핵심 이유 중 하나입니다.

> 🔍 **통찰**: `libs/shared`는 NestJS·React 어느 쪽에도 의존하지 않습니다. 이 제약 덕분에 백엔드 가드, 프론트엔드 조건부 렌더링, 시드 스크립트가 모두 같은 패키지를 공유할 수 있습니다.

---

## 5.7 가드와 데코레이터 — secure-by-default

### 전역 가드 등록

두 가드는 `AuthModule`의 `APP_GUARD`로 등록돼 있어 **모든 엔드포인트에 자동 적용**됩니다.

```typescript
// apps/core-backend/src/core/auth/auth.module.ts
{
  provide: APP_GUARD,
  useClass: JwtAuthGuard,      // ← 1번: 인증 확인
},
{
  provide: APP_GUARD,
  useClass: PermissionGuard,   // ← 2번: 권한 확인
},
```

### 요청 처리 흐름

```
HTTP 요청
  → JwtAuthGuard
      ├─ @Public() 있음 → 토큰이 있으면 req.user 채우고 통과 (비로그인도 허용)
      └─ @Public() 없음 → JWT 검증 → 실패 시 401
  → PermissionGuard
      ├─ @RequirePermission() 없음 → 통과
      └─ @RequirePermission() 있음 → hasAnyPermission() 체크 → 실패 시 403
  → Controller
```

### 데코레이터 사용 예시

```typescript
// 공개 엔드포인트 — 비로그인도 접근 가능
@Public()
@Get('posts')
findAll() { ... }

// 권한 필요 — 로그인 + board:create 권한 보유자만
@RequirePermission('board:create')
@Post('boards')
createBoard() { ... }

// 상수로 타입 안전하게
import { PERMISSIONS } from '@weaver2/shared';
@RequirePermission(PERMISSIONS.BOARD.CREATE)
@Post('boards')
createBoard() { ... }

// 여러 권한 중 하나만 있어도 통과 (OR 조건)
@RequirePermission([PERMISSIONS.POST.UPDATE_OWN, PERMISSIONS.POST.UPDATE_ALL])
@Patch('posts/:id')
updatePost() { ... }
```

데코레이터 파일:
- `@Public()` — `libs/common/src/decorator/public.decorator.ts`
- `@RequirePermission()` — `apps/core-backend/src/core/permission/decorators/require-permission.decorator.ts`

> 📌 **secure-by-default**: `@Public()`을 붙이지 않은 모든 엔드포인트는 기본적으로 JWT 인증이 필요합니다. "막아야 할 걸 막는" 방식이 아니라, "열어야 할 걸 연다"는 방식입니다.

> 💡 **팁 — `@Public()` 라우트의 로그인 감지**: `JwtAuthGuard`는 `@Public()` 엔드포인트에서도 쿠키에 유효한 토큰이 있으면 `req.user`를 채워 줍니다. 게시글 목록처럼 비로그인도 볼 수 있지만 로그인 상태에 따라 UI가 달라지는 곳에서 활용합니다.

---

## 5.8 인증·권한 전체 조감도

```
로그인 요청
  ├─ 이메일/비밀번호  →  LocalAuthGuard → SignInService.login()
  └─ 소셜 로그인     →  OAuthService.handleOAuthCallback()
              ↓
        2FA 활성화 여부 확인
          ├─ 없음 → JWT 쿠키 발급 (access_token 15분 / refresh_token 최대 30일)
          └─ 있음 → pre-auth 토큰(5분) 반환 → 2FA 검증 → JWT 쿠키 발급

API 요청
  → JwtStrategy (쿠키 → Bearer → ?token= 순으로 추출)
  → JwtAuthGuard (@Public 확인)
  → PermissionGuard (@RequirePermission 확인)
       └─ PermissionService.hasPermission()
              └─ 인메모리 LRU 캐시 (miss → DB → 캐시)
                   └─ 와일드카드 해소: *:* → resource:* → 정확한 매칭
```

---

→ **[6장 프론트엔드 (Frontend)](06-frontend.md)**
