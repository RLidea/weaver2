-- 인증 상태 재설계 — 확장 단계 (docs/design/specs/2026-10-17-auth-credential-model-design.md §3·§5).
-- 2FA·잠금·일회용 코드를 제자리 테이블로 옮기고, 이메일 소유 증명을 users 에 붙인다.
-- 옛 컬럼(local_credentials 의 2FA·잠금·토큰)과 two_factor_challenges · email_change_requests 는
-- 아직 지우지 않는다 — 서비스가 새 테이블로 다 옮겨 간 뒤 축소 마이그레이션이 지운다.
-- 그래서 이 마이그레이션만 적용된 상태에서도 지금 코드는 그대로 돈다.

-- 0-a. 켜져 있는 TOTP 의 비밀이 평문이면 멈춘다.
--      SQL 로는 암호화할 수 없고, 평문을 secretEncrypted 에 옮기면 이름과 내용이 어긋난다.
--      옛 스키마에서 `pnpm auth:encrypt-legacy-totp` 를 먼저 돌려 암호문으로 바꾼다.
--      (등록 중이던 비밀은 옮기지 않으므로 평문이어도 막지 않는다)
--      확인: SELECT "userId" FROM local_credentials WHERE "totpEnabled" AND "totpSecret" NOT LIKE 'v1:%';
DO $$
DECLARE
  plaintext text;
BEGIN
  SELECT string_agg("userId", ', ')
    INTO plaintext
    FROM local_credentials
   WHERE "totpEnabled" AND "totpSecret" NOT LIKE 'v1:%';

  IF plaintext IS NOT NULL THEN
    RAISE EXCEPTION
      'auth_credential_expand: 평문 TOTP 비밀이 남아 있습니다 — pnpm auth:encrypt-legacy-totp 를 먼저 돌리세요: %',
      plaintext;
  END IF;
END $$;

-- 0-b. TOTP 가 켜져 있는데 비밀이 없는 계정이 있으면 멈춘다.
--      옛 코드가 만들 수 없는 상태라, 어떻게 옮길지는 사람이 보고 정한다.
--      확인: SELECT "userId" FROM local_credentials WHERE "totpEnabled" AND "totpSecret" IS NULL;
DO $$
DECLARE
  broken text;
BEGIN
  SELECT string_agg("userId", ', ')
    INTO broken
    FROM local_credentials
   WHERE "totpEnabled" AND "totpSecret" IS NULL;

  IF broken IS NOT NULL THEN
    RAISE EXCEPTION
      'auth_credential_expand: TOTP 가 켜져 있는데 비밀이 없는 계정이 있습니다 — 먼저 확인하세요: %',
      broken;
  END IF;
END $$;

-- 1. 새 enum · 테이블 · 컬럼
CREATE TYPE "TwoFactorKind" AS ENUM ('TOTP', 'EMAIL');

CREATE TYPE "OneTimeCodePurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'EMAIL_CHANGE', 'TWO_FACTOR_LOGIN', 'TWO_FACTOR_SETUP', 'STEP_UP');

CREATE TYPE "AuthFactor" AS ENUM ('PASSWORD', 'SECOND_FACTOR');

ALTER TABLE "users" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

CREATE TABLE "two_factor_methods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "TwoFactorKind" NOT NULL,
    "secretEncrypted" TEXT,
    "lastUsedTimeStep" INTEGER,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_methods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "one_time_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "OneTimeCodePurpose" NOT NULL,
    "secretHash" TEXT NOT NULL,
    "newEmail" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_time_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_lockouts" (
    "userId" TEXT NOT NULL,
    "factor" "AuthFactor" NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "auth_lockouts_pkey" PRIMARY KEY ("userId","factor")
);

CREATE UNIQUE INDEX "two_factor_methods_userId_kind_key" ON "two_factor_methods"("userId", "kind");

CREATE UNIQUE INDEX "one_time_codes_secretHash_key" ON "one_time_codes"("secretHash");

CREATE INDEX "one_time_codes_expiresAt_idx" ON "one_time_codes"("expiresAt");

CREATE UNIQUE INDEX "one_time_codes_userId_purpose_key" ON "one_time_codes"("userId", "purpose");

ALTER TABLE "two_factor_methods" ADD CONSTRAINT "two_factor_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "one_time_codes" ADD CONSTRAINT "one_time_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_lockouts" ADD CONSTRAINT "auth_lockouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Prisma 가 표현 못 하는 불변식은 CHECK 로 — 앱 코드가 틀려도 DB 가 거절한다.
--    Prisma 는 CHECK 제약을 관리하지 않지만 지우지도 않는다.
ALTER TABLE "two_factor_methods" ADD CONSTRAINT "two_factor_methods_secret_iff_totp"
  CHECK (("kind" = 'TOTP') = ("secretEncrypted" IS NOT NULL));        -- TOTP 는 비밀이 있고 EMAIL 은 없다
ALTER TABLE "two_factor_methods" ADD CONSTRAINT "two_factor_methods_time_step_totp_only"
  CHECK ("kind" = 'TOTP' OR "lastUsedTimeStep" IS NULL);              -- 시간 단위는 TOTP 만
ALTER TABLE "two_factor_methods" ADD CONSTRAINT "two_factor_methods_email_confirmed"
  CHECK ("kind" = 'TOTP' OR "confirmedAt" IS NOT NULL);               -- 등록 중 EMAIL 은 one_time_codes 에 산다
ALTER TABLE "one_time_codes" ADD CONSTRAINT "one_time_codes_new_email_iff_change"
  CHECK (("purpose" = 'EMAIL_CHANGE') = ("newEmail" IS NOT NULL));
ALTER TABLE "one_time_codes" ADD CONSTRAINT "one_time_codes_new_email_lowercase"
  CHECK ("newEmail" = lower("newEmail"));
ALTER TABLE "one_time_codes" ADD CONSTRAINT "one_time_codes_attempts_non_negative"
  CHECK ("attempts" >= 0);
ALTER TABLE "auth_lockouts" ADD CONSTRAINT "auth_lockouts_failed_attempts_non_negative"
  CHECK ("failedAttempts" >= 0);

-- 3. 이메일 소유 증명 시각. 정확한 시각은 기록된 적이 없어 가장 가까운 값으로 추정한다.
--    인증된 로컬 계정 → 자격 행의 updatedAt, 로컬 자격이 없는 OAuth 계정 → 가입 시각.
--    인증 안 된 로컬 계정은 null 로 둔다.
UPDATE "users" u
   SET "emailVerifiedAt" = lc."updatedAt"
  FROM "local_credentials" lc
 WHERE lc."userId" = u."id" AND lc."isVerified";

UPDATE "users" u
   SET "emailVerifiedAt" = u."createdAt"
 WHERE NOT EXISTS (SELECT 1 FROM "local_credentials" lc WHERE lc."userId" = u."id");

-- 4. 확인된 2FA 수단. 등록 중이던 TOTP 비밀(totpEnabled = false)은 버린다 — 다시 등록하면 된다.
INSERT INTO "two_factor_methods" ("id", "userId", "kind", "secretEncrypted", "confirmedAt")
SELECT gen_random_uuid()::text, lc."userId", 'TOTP', lc."totpSecret", lc."updatedAt"
  FROM "local_credentials" lc
 WHERE lc."totpEnabled";

INSERT INTO "two_factor_methods" ("id", "userId", "kind", "confirmedAt")
SELECT gen_random_uuid()::text, lc."userId", 'EMAIL', lc."updatedAt"
  FROM "local_credentials" lc
 WHERE lc."emailOtpEnabled";

-- 5. 남아 있는 실패 횟수·잠금은 비밀번호 요소로 옮긴다.
--    옛 카운터는 2FA 실패도 함께 셌지만(6970b67) 어느 쪽이었는지 남아 있지 않다 —
--    로그인 첫 관문인 PASSWORD 에 두면 잠금이 풀리는 일은 없다.
INSERT INTO "auth_lockouts" ("userId", "factor", "failedAttempts", "lockedUntil")
SELECT lc."userId", 'PASSWORD', lc."failedAttempts", lc."lockedUntil"
  FROM "local_credentials" lc
 WHERE lc."failedAttempts" > 0 OR lc."lockedUntil" IS NOT NULL;

-- 6. 진행 중이던 재설정·인증 링크와 2FA·이메일 변경 코드는 옮기지 않는다.
--    해시 방식이 바뀌어(bcrypt → HMAC) 옮길 수 없고, 길어야 1시간분이라 다시 요청하면 된다.
