# 인증 상태 모델 재설계 — 비밀번호·2FA·일회용 코드·잠금을 제자리로

- **날짜**: 2026-10-17
- **상태**: v2 — 적대 검토 반영, 메인테이너 승인(2026-10-17)
- **참여**: 메인테이너(방향 결정: 「빠른 땜질이 아니라 근본 수정, DB 구조는 깔끔하게」) · AI 어시스턴트(조사·설계) · 독립 크리틱 에이전트(적대 검토)
- **관련 문서**: [`handbook/03-auth`](../../handbook/03-auth.md) · [파일 접근 통제 설계](./2026-10-17-file-access-control-design.md)

---

## 1. 배경

남은 보안 구멍 셋이 있었다. ① 2FA 해제 확인 코드에 실패 제한이 없다 ② TOTP 코드를 30초 안에 다시 쓸 수 있다 ③ 이메일 인증·재설정이 탈퇴·정지를 보지 않고, 재설정이 잠금을 풀지 않는다.

셋 다 「그 자리에 검사 한 줄·컬럼 하나」로 막을 수 있다. 하지만 원인을 따라가면 **같은 뿌리**에서 나온다. 보일러플레이트의 스키마는 파생 프로젝트 전부가 물려받고, 나중에 고치려면 하류마다 마이그레이션이 필요하다. 그래서 지금 뿌리를 고친다.

## 2. 뿌리 — 지금 구조가 틀린 곳

### R1. `LocalCredential` 한 행이 다섯 가지 책임을 진다

```
local_credentials: password · passwordResetToken/resetTokenExpiry · verificationToken/verificationTokenExpiry
                   · isVerified · totpEnabled/totpSecret/emailOtpEnabled · failedAttempts/lockedUntil
```

이름은 「비밀번호 자격」인데 이메일 소유 증명, 2FA, 잠금까지 들고 있다. R2·R5 가 여기서 나온다.

### R2. 2FA 가 「비밀번호의 속성」이다 — OAuth 로그인은 2FA 를 건너뛴다

- OAuth 콜백(`oauth.service.ts:142-151`)은 사용자를 찾자마자 세션을 발급한다. `LocalCredential` 을 보지 않으니 2FA 도 보지 않는다.
- OAuth 전용 사용자는 2FA 를 켤 수 없다. 화면은 보이는데 TOTP 는 「Local credential not found」, 이메일 OTP 는 확인 단계에서 P2025(500).
- 지금은 한 계정이 비밀번호와 OAuth 를 함께 가질 길이 없어 우회가 **잠복** 상태다. 연동·「비밀번호 설정」이 생기는 순간 열린다 — 둘 다 백로그에 있다.

2FA 는 **사람(User)** 에 붙는 것이지 로그인 수단 하나에 붙는 것이 아니다.

### R3. 「로그인 완료」가 두 갈래로 따로 구현돼 있다

| 검사 | 비밀번호 | OAuth |
|---|---|---|
| 정지(`suspendedUntil`) | ✅ | ❌ (리프레시 토큰은 발급되고 액세스에서야 막힘) |
| 2FA | ✅ | ❌ |
| 리프레시 토큰 IP·UA, rememberMe 수명 | ✅ | ❌ (항상 7일) |

검사를 경로마다 복사하면 경로가 늘 때마다 하나씩 빠진다.

### R4. 토큰의 「종류」를 아무도 확인하지 않는 자리가 있다 (검토에서 발견, **현재 열린 구멍**)

`JwtAuthGuard` 의 `@Public` 분기(`jwt-auth.guard.ts:41-63`)는 `access_token` 쿠키를 `jwtService.verify` 로 서명만 확인한다. `type` 도, 탈퇴·정지도 보지 않는다. pre-auth 토큰은 같은 비밀로 서명되므로(`two-factor.service.ts:67`) **비밀번호만 아는 사람이 pre-auth 토큰을 `access_token` 쿠키에 넣으면 2FA 없이 그 사람으로 공개 라우트를 읽는다** — 회원 전용 게시판·비밀글·댓글. 탈퇴·정지된 사용자의 남은 액세스 토큰도 같다.

뿌리는 「토큰 검증이 두 곳(`JwtStrategy` 와 가드의 `@Public` 분기)에 따로 있다」는 것 — R3 과 같은 모양이다.

### R5. 일회용 비밀이 네 가지 모양으로 흩어져 있다

| 무엇 | 어디 | 해시 | 코드별 시도 한도 | 정리 |
|---|---|---|---|---|
| 비밀번호 재설정 링크 | `local_credentials` 컬럼 2개 | SHA-256 | (256비트라 불필요) | 없음 |
| 가입 인증 링크 | `local_credentials` 컬럼 2개 | SHA-256 | (불필요) | 없음 |
| 2FA 이메일 코드 | `two_factor_challenges` (`method` 는 자유 문자열) | bcrypt | **없음** — 로그인만 계정 잠금에 기댄다 | 없음 |
| 이메일 변경 코드 | `email_change_requests` | bcrypt | **없음** — IP 스로틀뿐 | 없음 |

- 6자리 코드에 **코드 자체의 한도**가 없어서, 경로마다 계정 잠금을 붙이거나(로그인) 잊었다(2FA 해제·이메일 변경). 구멍 ①이 여기서 나왔다.
- 재발급 유예는 발급 시각 컬럼이 없어 `만료 - TTL` 로 역산한다. 2FA 이메일 발송에는 유예가 아예 없다.
- 2FA 해제는 「로그인 챌린지」를 받는데, 로그인한 사용자는 그 챌린지를 요청할 길이 없다(`/2fa/email/send` 는 pre-auth 전용) — 이메일로 해제하는 경로가 사실상 깨져 있다.
- 이메일 변경 코드는 `randomInt(100000, 999999)` — 999999 가 안 나온다.

### R6. 잠금 카운터가 비밀번호 행에 산다

`failedAttempts/lockedUntil` 이 `LocalCredential` 에 있으니 OAuth 사용자가 2FA 를 켜도 셀 곳이 없다. 카운터를 쓰는 곳도 로그인과 `/2fa/authenticate` 둘뿐이다 — 가입 인증 시 비밀번호, 2FA 해제, 등록 확인, 비밀번호 변경은 세지 않는다.

### R7. TOTP 에 「마지막으로 쓴 시간 단위」가 없다 (구멍 ②)

### R8. 상태를 바꾸는 GET (검토에서 발견, **현재 열린 구멍**)

`GET /2fa/totp/setup` 이 켜져 있던 TOTP 를 끄고 새 비밀을 쓴다(`two-factor.controller.ts:88`). GET 은 CSRF 면제이고 인증 쿠키는 `SameSite=Lax` 라, **다른 사이트에서 링크 한 번(최상위 이동)으로 피해자의 TOTP 가 꺼진다.**

## 3. 목표 모델

원칙: **한 테이블은 한 가지 사실만 안다. 상태는 그 사실이 속한 주체(User)에 붙는다.**

이름 규칙은 지금 스키마를 따른다 — 테이블만 `@@map` 으로 snake_case, **컬럼은 `@map` 없이 camelCase**(SQL 에서는 `"userId"` 처럼 따옴표). 아래 SQL 조각도 전부 그 규칙이다.

```prisma
model User {
  // …기존 필드…
  emailVerifiedAt DateTime?   // 지금의 email 주인임이 증명된 시각. email 이 바뀌면 다시 정해진다(§4.6)
}

/// 비밀번호 하나만 안다.
model LocalCredential {
  userId            String   @id
  passwordHash      String
  passwordChangedAt DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("local_credentials")
}

enum TwoFactorKind {
  TOTP
  EMAIL
}

/// 사람에 붙는 2차 인증 수단. 로그인 수단(비밀번호·OAuth)과 무관하다.
model TwoFactorMethod {
  id               String        @id @default(uuid())
  userId           String
  kind             TwoFactorKind
  secretEncrypted  String?       // TOTP 만 (AES-256-GCM, v1 형식)
  lastUsedTimeStep Int?          // TOTP 만 — 이 값 이하의 시간 단위는 거절(재사용 차단)
  confirmedAt      DateTime?     // TOTP 만 null 가능 = QR 을 받았지만 코드로 확인 전
  createdAt        DateTime      @default(now())
  user             User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, kind])
  @@map("two_factor_methods")
}

enum OneTimeCodePurpose {
  EMAIL_VERIFICATION   // 링크 — 가입 인증
  PASSWORD_RESET       // 링크
  EMAIL_CHANGE         // 6자리 — 새 주소로
  TWO_FACTOR_LOGIN     // 6자리 — pre-auth 상태에서
  TWO_FACTOR_SETUP     // 6자리 — 이메일 2FA 켜기
  STEP_UP              // 6자리 — 로그인한 사용자가 민감한 동작(2FA 해제 등) 전에 다시 증명
}

/// 메일로 보내는 일회용 비밀 전부. 쓰면 행을 지운다(소비 = 삭제).
model OneTimeCode {
  id         String             @id @default(uuid())
  userId     String
  purpose    OneTimeCodePurpose
  secretHash String             @unique
  newEmail   String?            // EMAIL_CHANGE 만 (아래 「선택한 것」 참조)
  attempts   Int                @default(0)
  expiresAt  DateTime
  createdAt  DateTime           @default(now())
  user       User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, purpose])   // 목적마다 살아 있는 것은 하나
  @@index([expiresAt])          // 정리 작업용
  @@map("one_time_codes")
}

enum AuthFactor {
  PASSWORD
  SECOND_FACTOR   // TOTP·이메일 2FA 코드
}

/// 사람·요소별 추측 실패. 요소를 나누는 이유는 §4.4.
model AuthLockout {
  userId         String
  factor         AuthFactor
  failedAttempts Int        @default(0)
  lockedUntil    DateTime?
  user           User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, factor])
  @@map("auth_lockouts")
}
```

**없어지는 것**: `local_credentials` 의 토큰·인증·2FA·잠금 컬럼 9개와 `id`, `two_factor_challenges`, `email_change_requests`.

### DB 가 지키는 불변식 (CHECK)

Prisma 가 표현 못 하는 것은 마이그레이션 SQL 에 CHECK 로 박는다. 앱 코드가 틀려도 DB 가 거절한다.

```sql
-- two_factor_methods
CHECK ((kind = 'TOTP') = ("secretEncrypted" IS NOT NULL))         -- TOTP 는 비밀이 있고 EMAIL 은 없다
CHECK (kind = 'TOTP' OR "lastUsedTimeStep" IS NULL)                -- 시간 단위는 TOTP 만
CHECK (kind = 'TOTP' OR "confirmedAt" IS NOT NULL)                 -- 등록 중 EMAIL 은 one_time_codes 에 산다
-- one_time_codes
CHECK ((purpose = 'EMAIL_CHANGE') = ("newEmail" IS NOT NULL))
CHECK ("newEmail" = lower("newEmail"))
CHECK (attempts >= 0)
-- auth_lockouts
CHECK ("failedAttempts" >= 0)
```

### 선택한 것과 이유

- **`newEmail` 을 범용 테이블에 둔다.** 대안은 1:1 `email_change_requests("codeId" PK/FK)` 지만, 컬럼 하나를 위해 테이블과 조인을 하나 더 두는 것보다 CHECK 두 줄이 더 단순하고 DB 가 똑같이 지킨다.
- **6자리 코드 해시 = HMAC-SHA256.** 지금의 bcrypt 는 DB 가 새면 100만 후보를 몇 시간이면 다 돈다. 키를 건 HMAC 은 DB 만으로 못 푼다. 키는 **새 환경 변수를 만들지 않고** 기존 `JWT_SECRET` 에서 HKDF(`info = "weaver2/one-time-code/v1"`)로 파생한다 — 하류마다 부팅을 막는 새 필수 값이 생기지 않고, 용도별로 키가 분리된다. `JWT_SECRET` 을 바꾸면 살아 있던 코드(최대 10분)만 무효가 된다. 입력은 `purpose ‖ 0x00 ‖ userId ‖ 0x00 ‖ code` — 구분자가 있어 이어 붙인 값이 서로 부딪히지 않는다.
- **링크 토큰(256비트) = SHA-256.** 엔트로피가 커서 키가 필요 없다(지금과 같다).

## 4. 동작 — 뿌리별로 어떻게 닫히는가

### 4.0 토큰 검증은 한 곳 (R4 — 선행 조건, 파일 설계도 이것에 기댄다)

- pre-auth 토큰에 `aud: "pre-auth"`, 액세스 토큰에 `aud: "access"` 를 넣고 **검증할 때 `audience` 를 요구**한다. 서명이 같아도 종류가 다르면 거절된다.
- `@Public` 분기의 선택적 인증은 `JwtStrategy.validate` 와 **같은 함수**를 부른다 — `aud`·탈퇴·정지를 똑같이 본다. 실패하면 비로그인으로 다룬다.

### 4.1 로그인 완료는 한 곳 (R3)

`SignInCompletionService` 가 모든 경로의 끝에 선다.

1. **요소 확인이 먼저**: 비밀번호·OAuth 콜백이 맞은 뒤에야 계정 상태를 말한다. 지금은 비밀번호를 보기 전에 `ACCOUNT_DELETED`·정지 날짜를 알려 준다(`sign-in.service.ts:43,51`) — 이메일만으로 계정 상태가 샌다.
2. `deletedAt` → 거절
3. 확인된 `TwoFactorMethod` 가 있으면 → pre-auth 발급, 세션은 아직 없다
4. `suspendedUntil > now` → 거절 — **2FA 가 있는 계정은 2FA 를 통과한 뒤에야 말한다** (메인테이너, 2026-10-18 리뷰 반영). 3보다 앞에 두면 비밀번호만 가진 사람이 정지 사실과 기간을 안다.
5. 액세스·리프레시 발급(IP·UA·rememberMe 반영), `lastLoginAt` 갱신

2FA 통과(`/2fa/authenticate`) 뒤에는 **2부터 다시**(3은 건너뛴다) — pre-auth 5분 사이에 탈퇴·정지가 끼어들 수 있다.

**pre-auth 운반 = HttpOnly 쿠키** (`pre_auth`, 5분, `SameSite=Lax`, `Secure`, **`Path=/`**). OAuth 콜백은 리다이렉트라 본문에 토큰을 실을 수 없기 때문이다.
- `Path` 를 `/v1/auth/2fa` 로 좁히지 않는 이유: 브라우저는 Next 의 `/api` 리라이트 **앞의** 주소(`/api/v1/auth/2fa/…`)로 쿠키 경로를 맞춘다. 백엔드가 보는 경로로 좁히면 쿠키가 영영 안 간다. 파생 프로젝트가 API 를 직접 부르면 접두사가 또 다르다. 토큰이 `aud` 로 묶여 있으니(4.0) 넓은 경로가 위험을 늘리지 않는다.
- 응답 본문은 `{ twoFactorRequired: true, availableMethods }` 만.
- **그만두기는 `DELETE /v1/auth/2fa/pending`** — 대기 중인 브라우저에는 세션이 없어 로그아웃을 부를 수 없고, 쿠키가 HttpOnly 라 화면이 직접 못 지운다. 로그아웃도 `pre_auth` 를 함께 지운다.
- OAuth 는 2FA 가 필요하면 `OAUTH_TWO_FACTOR_REDIRECT_URL`(기존 `OAUTH_SUCCESS_REDIRECT_URL`·`OAUTH_FAILURE_REDIRECT_URL` 과 같은 줄, 예시 `http://localhost:3000/login?step=2fa`)로 보낸다. 화면은 **`GET /v1/auth/2fa/pending`**(pre-auth 쿠키 → `{ availableMethods }`)으로 수단을 알아낸다. 비밀번호 로그인도 같은 화면을 쓴다.

### 4.2 2FA 는 사람에 붙는다 (R2, R8)

- 등록·확인·해제·상태가 `TwoFactorMethod` 를 본다. OAuth 전용 사용자도 켤 수 있다.
- **TOTP 등록은 `POST`.** 확인된 TOTP 가 이미 있으면 거절한다(해제가 먼저, 해제는 코드가 필요). 등록 중 행만 덮어쓴다. 확인된 행은 등록 경로가 절대 건드리지 않는다.
- 등록 확인에 성공하면 그 코드의 시간 단위를 `lastUsedTimeStep` 에 넣는다 — 확인에 쓴 코드로 바로 로그인하지 못하게.
- 해제는 `STEP_UP` 코드(로그인한 사용자가 `POST /v1/auth/2fa/step-up/send` 로 받는다) 또는 TOTP 코드로.
- **분실 복구**: 관리자가 사용자의 2FA 를 초기화하는 엔드포인트(`USER.UPDATE` 권한, 감사 로그). OAuth 사용자까지 2FA 를 켤 수 있게 되므로 복구 경로를 미루지 않는다.

### 4.3 일회용 코드 (R5 → 구멍 ①)

`OneTimeCodeService` 하나가 발급·확인·소비를 맡는다.

**발급**
- 목적마다 **재발급 유예**(링크 10분, 코드 60초)를 DB 가 지킨다: `INSERT … ON CONFLICT ("userId", purpose) DO UPDATE SET … WHERE one_time_codes."createdAt" < now() - 유예`. 갱신된 행이 없으면 429. 시각은 SQL `now()` 가 아니라 앱이 UTC 로 넘긴다 — 컬럼은 시간대 없는 `TIMESTAMP` 에 UTC 벽시계 값이고 DB 세션 시간대는 서버 설정을 따른다(이 맥은 KST, 9시간 차).
- **메일 발송이 실패하면 방금 쓴 행을 거둔다** (리뷰에서 추가) — 안 거두면 메일도 못 받은 채 유예에 걸린다.
- **재발급은 `attempts` 를 되돌리지 않는다.** 되돌리면 「5번 틀리고 → 새로 받고 → 5번 더」가 끝없이 된다. 한도를 다 쓴 코드는 만료될 때까지 새로 받을 수 없다.
- 코드 생성은 한 함수 — `randomInt(0, 1_000_000)` 을 6자리로 0 채움.

**확인(6자리) — 확인하기 전에 시도를 잡는다** (로그인 잠금 `c23e25b` 와 같은 원리)
1. `UPDATE one_time_codes SET attempts = attempts + 1 WHERE "userId" = $1 AND purpose = $2 AND attempts < 5 AND "expiresAt" > now() RETURNING id` — 행이 없으면 거절. 동시에 몇 개가 와도 5개까지만 지나간다.
2. `DELETE FROM one_time_codes WHERE id = $id AND "secretHash" = HMAC(입력)` — 지운 행이 1이면 성공. HMAC 은 결정적이라 비교와 소비가 한 문장이다. `secretHash` 가 조건에 있으니, 확인 도중 재발급이 끼어들어도 옛 코드가 새 행을 지우지 못한다.

**확인(링크)**: `DELETE … WHERE "secretHash" = $1 AND purpose = $2 AND "expiresAt" > now() RETURNING "userId"`. 가입 인증은 비밀번호 확인이 먼저다 — 지금처럼 비밀번호가 틀려도 링크는 소비하지 않는다(그 비밀번호 시도는 `PASSWORD` 잠금에 센다).

**정리**: 만료된 행을 매시간 지우는 스케줄러.

### 4.4 잠금 (R6)

요소별로 센다. 지금의 `ReserveLoginAttemptCommand`(확인 전에 원자적으로 잡기)를 그대로 옮기고, 행이 없으면 `INSERT … ON CONFLICT DO NOTHING` 으로 먼저 만든다.

| 요소 | 세는 곳 |
|---|---|
| `PASSWORD` | 로그인, 가입 인증 시 비밀번호, 비밀번호 변경, 이메일 변경 시 비밀번호 |
| `SECOND_FACTOR` | 로그인 2FA(TOTP·이메일 코드 모두), 2FA 해제, TOTP 등록 확인 |

- **로그인 2FA 의 이메일 코드도 `SECOND_FACTOR` 에 센다.** 그 단계에 온 사람은 이미 비밀번호를 안다 — 남의 메일함 없이 남을 잠그는 길이 아니다. 코드별 한도(4.3)와 겹으로 막는다.
- **재설정 성공은 `PASSWORD` 만 비운다.** `SECOND_FACTOR` 까지 비우면, 메일함을 가진 공격자가 「TOTP 5번 → 재설정 → 5번 더」를 반복할 수 있다 — 메일함 탈취를 막으라고 있는 2FA 가 무력해진다.
- **받아들이는 위험**: 이메일만 아는 누군가가 비밀번호를 5번 틀려 남을 15분 잠글 수 있다. 지금도 그렇고, 계정 잠금 방식의 본질적 대가다. handbook 에 적는다.

### 4.5 TOTP 재사용 (R7 → 구멍 ②)

otplib 13 `verify({ afterTimeStep: lastUsedTimeStep })` — 이미 쓴 단계는 거절. 시계 차이로 저장된 단계가 현재 허용 범위보다 크면 `AfterTimeStepRangeExceededError` 를 던지므로 잡아서 「틀린 코드」로 다룬다. 통과하면:

```sql
UPDATE two_factor_methods SET "lastUsedTimeStep" = $step
WHERE id = $id AND ("lastUsedTimeStep" IS NULL OR "lastUsedTimeStep" < $step)
```

갱신된 행이 0이면 동시 요청에 진 것 — 거절. 같은 코드 동시 두 번 → 하나만 통과.

### 4.6 이메일 소유와 계정 상태 (구멍 ③)

- 가입 인증·재설정·이메일 변경 확인 성공 → 같은 UPDATE 에서 `"emailVerifiedAt" = now()`. 로그인은 `LocalCredential` 이 아니라 이 컬럼을 본다.
- **관리자가 이메일을 바꾸면 `emailVerifiedAt = null`.** 관리자는 그 주소의 주인임을 증명하지 못한다. 사용자는 인증 메일 재발송으로 다시 증명한다.
- **이메일이 바뀌면(본인·관리자 모두) 옛 주소로 나간 재설정·인증 링크를 버린다** (2026-10-17 리뷰에서 추가). 옛 메일함이 털려 주소를 옮긴 사람이 그 링크로 1시간 안에 다시 털리지 않게.
- OAuth: `OAuthUserProfile` 에 `emailVerified: boolean` 을 더하고 공급자마다 옮긴다(Google v2 userinfo 의 `verified_email`, Kakao `is_email_verified`, Apple `email_verified`). **Naver 는 이 값을 주지 않는다** — 믿는 것으로 정했다(§7).
- **검증되지 않은 이메일로는 OAuth 가입을 받지 않는다** (메인테이너, 2026-10-18 리뷰 반영). 받으면 남의 주소를 주장하는 공급자 계정으로 그 주소의 계정을 선점할 수 있다. 이미 선점된 계정은 주인이 재설정으로 되찾을 때(미인증 → 인증) **소셜 연동을 끊는다**.
- 가입 인증·재설정은 `deletedAt` 이면 거절. 정지는 막지 않는다 — 메일함 주인 증명은 정지와 별개이고, 로그인은 4.1 이 막는다.
- 탈퇴 트랜잭션은 `TwoFactorMethod`·`OneTimeCode`·`AuthLockout` 도 지운다(지금은 챌린지·변경 요청이 남는다).

## 5. 데이터 이전

**이름 바꾸기는 손으로 쓴다.** Prisma 가 만든 SQL 은 이름 변경을 DROP + ADD 로 내서 데이터가 사라진다(NOT NULL 이면 데이터 있는 DB 에서만 실패하고, 빈 DB 의 CI 는 통과한다). `migrate dev --create-only` 로 뼈대만 받고 `ALTER TABLE … RENAME COLUMN` 으로 고친다.

**마이그레이션은 둘이다 — 확장(1~6)과 축소(7).** 하나로 옛 컬럼까지 지우면, 그 컬럼을 쓰는 코드(약 45개 파일)를 step 2~4 가 다 옮길 때까지 빌드가 깨진다(§9 「커밋마다 녹색」과 부딪힌다). 확장은 새 테이블을 더하고 데이터를 복사만 해서 옛 코드가 그대로 돌고, 축소는 서비스가 다 옮겨 간 뒤 옛 것을 지운다. **둘은 같은 착륙으로 함께 나간다**(메인테이너, 2026-10-17) — 배포 때 확장 직후 축소가 돌아 그 사이에 옛 컬럼에 쓰이는 값이 없으므로 다시 옮길 일이 없다. 각 마이그레이션 안에서는 순서대로, **확신이 없으면 멈춘다** (이메일 소문자 마이그레이션과 같은 방식).

1. **켜져 있는 TOTP 의 비밀이 평문이면 멈춘다** (`"totpEnabled" AND "totpSecret" NOT LIKE 'v1:%'` — 등록 중이던 비밀은 옮기지 않으므로 막지 않는다). SQL 로는 암호화할 수 없다. 메시지는 「`pnpm auth:encrypt-legacy-totp` 를 먼저 돌리라」 — 이 스크립트는 **옛 스키마에서** 돌아 평문을 암호문으로 바꾼다. 그래서 `decryptSecret` 의 평문 통과·지연 재암호화 코드도 지운다(step 3). 켜져 있는데 비밀이 없는 행도 옛 코드가 만들 수 없는 상태라 멈춘다.
2. 새 enum·테이블·`users."emailVerifiedAt"`·CHECK 생성
3. `"emailVerifiedAt"`: 인증된 로컬 계정 → `local_credentials."updatedAt"`(정확한 시각은 기록된 적이 없다 — 가장 가까운 추정), `LocalCredential` 이 없는 OAuth 계정 → `users."createdAt"`
4. `two_factor_methods`: `"totpEnabled"` → TOTP 확인됨, `"emailOtpEnabled"` → EMAIL 확인됨(`"confirmedAt" = "updatedAt"`). 등록 중이던 TOTP 비밀은 버린다
5. `auth_lockouts`: 0이 아닌 카운터·잠금을 `PASSWORD` 로 옮긴다
6. 진행 중이던 링크와 코드는 **옮기지 않는다** — 해시 방식이 바뀌어 옮길 수 없다. 사용자는 다시 요청하면 된다(최대 1시간분)
7. **(축소)** `local_credentials`: `RENAME COLUMN password TO "passwordHash"`, 기본키를 `"userId"` 로, 옛 컬럼·테이블 삭제. 지우기 전에 **켜져 있던 2FA 가 `two_factor_methods` 에 다 있는지** 보고 아니면 멈춘다(옮기지 못한 채 지워 2FA 가 조용히 꺼지지 않게). `passwordChangedAt` 의 기존 행은 `updatedAt` 으로 채운다 — DB 기본값은 세션 시간대(KST)를 따라 UTC 가 아니다.
   - **잰 것 (2026-10-18)**: 공용 개발 DB(확장 전)를 덤프한 복제본에 확장 → 축소를 연달아 적용 → 시드 관리자로 HTTP 로그인 201·내 정보 200·틀린 비밀번호 401. 비밀번호 해시 지문 동일, Prisma 스키마와 DB 차이 0. 확장 뒤 옛 컬럼에만 2FA 를 켜 두면 축소가 사용자를 짚으며 멈추고 아무것도 지우지 않는다.

**트랜잭션 — 확인함 (2026-10-17)**: Prisma 7 은 PostgreSQL `migration.sql` 을 한 트랜잭션으로 감싼다. 확장 마이그레이션 끝에 일부러 `SELECT 1/0` 을 붙여 격리 DB 에서 돌리니, 앞서 만든 enum·테이블·컬럼이 하나도 남지 않았고 `_prisma_migrations` 에는 `finished_at` 이 빈 실패 기록만 남았다. 파일 안에서 따로 감쌀 필요는 없다.

**배포 순서** (handbook 에 런북으로): 백업 → 1단계 스크립트 → `db:deploy` → 코드 재시작. 멈췄으면 `prisma migrate resolve --rolled-back <이름>` → 원인 해결 → 다시. 열을 지우므로 되돌리기는 백업 복원뿐이다.

## 6. API 영향

| 바뀌는 것 | 하위 영향 |
|---|---|
| 로그인 응답의 `preAuthToken` 제거, `pre_auth` 쿠키로 | `packages/auth` 로그인 폼·`sendLoginEmailOtp`·`authenticate` |
| `GET /v1/auth/2fa/pending` 추가 | 2FA 화면이 수단을 여기서 받는다 |
| OAuth 콜백이 2FA 필요 시 `OAUTH_TWO_FACTOR_REDIRECT_URL` 로 | `/login?step=2fa` |
| `GET /2fa/totp/setup` → `POST` | 설정 화면 |
| `POST /2fa/step-up/send` 추가, 해제가 STEP_UP 코드를 받는다 | 해제 화면 |
| 관리자 2FA 초기화 추가 | 관리자 사용자 상세 |
| `CommonAuthUser.totpEnabled/emailOtpEnabled` 제거 | local strategy |
| `OAuthUserProfile.emailVerified` 추가 | 파생 프로젝트의 자체 공급자 |
| 2FA 상태 조회 모양은 유지 | — |

## 7. 결정한 것

- **Naver 이메일은 검증된 것으로 본다** (메인테이너, 2026-10-17). Naver API 는 검증 여부를 주지 않지만 계정 이메일은 Naver 가 관리한다. Naver 공급자는 `emailVerified: true` 를 고정으로 내고, 그 이유를 공급자 코드 주석과 handbook 에 적는다. 파생 프로젝트가 생각이 다르면 그 한 줄을 바꾼다.

## 8. 범위 밖 (따로 정한다)

- **탈퇴한 이메일 재사용**: `users.email` 이 남아 같은 주소로 다시 가입할 수 없다(OAuth 는 P2002 로 일반 실패). 제품 결정.
- **OAuth 연동·비밀번호 설정 엔드포인트**: 이 설계가 그 길을 안전하게 연다. 엔드포인트 자체는 별도.
- **`auto-deploy.sh` 가 마이그레이션을 돌리지 않는다** (검토에서 발견): pull → build → `pm2 restart` 뿐이라 새 코드가 옛 스키마로 뜬다. 이 설계와 무관하게 고쳐야 할 배포 틀의 구멍 — 별도 작업으로 올린다.

## 9. 작업 순서

격리 레인 하나(`--isolated`), 커밋마다 빌드·테스트 녹색. 파일 설계와 둘 다 `users` 를 건드리므로 **이 레인이 먼저 착륙**하고, 파일 레인은 rebase 뒤 `db:generate`.

0. **4.0 토큰 검증 일원화 + R8 TOTP 등록 POST** — 지금 열린 구멍이라 스키마 변경 전에 먼저(작고 독립적)
1. 스키마·**확장** 마이그레이션·CHECK, 옛 TOTP 암호화 스크립트 (저장소 계층은 쓰는 단계에서 함께 만든다 — 부르는 곳 없이 미리 짓지 않는다)
2. `OneTimeCodeService` 로 재설정·인증·2FA 이메일·이메일 변경 교체, STEP_UP, 정리 스케줄러
3. `TwoFactorMethod`·`AuthLockout`·TOTP 재사용 차단·관리자 2FA 초기화
4. `SignInCompletionService` — 비밀번호·OAuth·2FA 통과를 한 곳으로, pre-auth 쿠키, `/2fa/pending`, 프런트
5. 시드(`prisma/seed/user.seed.ts`)와 기존 통합 테스트(`login-attempt`·`auth-security`·`email-case`) 이전, 그다음 **축소** 마이그레이션(§5-7) — 옛 컬럼을 읽는 코드가 0이 된 뒤
6. 새 통합 테스트(실제 DB): 코드 동시 20회 → 5회만 확인, 재발급해도 시도 수 유지, TOTP 같은 단계 동시 2회 → 1회, 재설정이 `SECOND_FACTOR` 를 못 비움, pre-auth 토큰으로 공개 라우트 → 비로그인 취급, OAuth+2FA, 정지 계정 OAuth 거절. **데이터를 채운 DB 로 마이그레이션** 돌려 이전 결과 확인
7. e2e: Next 를 거친 실제 2FA 로그인(쿠키 경로 확인)
8. handbook 03-auth(배포 런북·받아들인 위험), `.env.example`, CHARTER
