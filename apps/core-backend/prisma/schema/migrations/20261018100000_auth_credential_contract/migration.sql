-- 인증 상태 재설계 — 축소 단계 (docs/design/specs/2026-10-17-auth-credential-model-design.md §5-7).
-- 확장 단계(20261017130000_auth_credential_expand)가 2FA·잠금·이메일 인증을 새 테이블로 옮겼고,
-- 서비스는 이제 옛 컬럼을 읽지도 쓰지도 않는다. 옛 것을 지우고 local_credentials 를 「비밀번호
-- 하나만 아는」 모양으로 줄인다.
--
-- 🔴 열을 지우므로 되돌리기는 백업 복원뿐이다. 배포는 백업 → db:deploy → 재시작 순서다.
-- 🔴 Prisma 가 만든 SQL 은 password → passwordHash 를 DROP + ADD 로 내 비밀번호를 전부 잃는다
--    (빈 DB 의 CI 는 통과한다). 그래서 이름 바꾸기는 손으로 쓴다.

-- 0. 확장 단계가 옮겨 둔 것이 맞는지 — 켜져 있던 2FA 가 새 테이블에 없으면 멈춘다.
--    지우고 나면 되찾을 수 없으니, 옮겨지지 않은 채 지워 2FA 가 조용히 꺼지는 일을 막는다.
--    확인: SELECT "userId" FROM local_credentials lc WHERE lc."totpEnabled"
--            AND NOT EXISTS (SELECT 1 FROM two_factor_methods m WHERE m."userId" = lc."userId" AND m.kind = 'TOTP');
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(lc."userId", ', ')
    INTO missing
    FROM local_credentials lc
   WHERE (lc."totpEnabled" AND NOT EXISTS (
            SELECT 1 FROM two_factor_methods m
             WHERE m."userId" = lc."userId" AND m.kind = 'TOTP' AND m."confirmedAt" IS NOT NULL))
      OR (lc."emailOtpEnabled" AND NOT EXISTS (
            SELECT 1 FROM two_factor_methods m
             WHERE m."userId" = lc."userId" AND m.kind = 'EMAIL'));

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'auth_credential_contract: 켜져 있던 2FA 가 two_factor_methods 에 없습니다 — 확장 마이그레이션 뒤에 옛 컬럼에 쓴 코드가 있었는지 확인하세요: %',
      missing;
  END IF;
END $$;

-- 1. 비밀번호 — 이름만 바꾼다(값은 그대로)
ALTER TABLE "local_credentials" RENAME COLUMN "password" TO "passwordHash";
-- PostgreSQL 18 부터는 NOT NULL 도 이름 있는 제약이라 옛 이름(…_password_not_null)이 남는다.
-- 그런 제약이 있을 때만 이름을 맞춘다(그 전 버전에는 없다).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint
              WHERE conrelid = 'local_credentials'::regclass
                AND conname = 'local_credentials_password_not_null') THEN
    ALTER TABLE "local_credentials"
      RENAME CONSTRAINT "local_credentials_password_not_null"
      TO "local_credentials_passwordHash_not_null";
  END IF;
END $$;

-- 비밀번호를 바꾼 시각. 기존 행은 기록이 없어 자격 행의 마지막 수정 시각으로 둔다.
-- 기본값(CURRENT_TIMESTAMP)은 DB 세션 시간대를 따라 UTC 가 아닐 수 있어 기존 행에 쓰지 않는다
-- — 앱(Prisma)이 새 행에는 UTC 로 값을 넣는다.
ALTER TABLE "local_credentials" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
UPDATE "local_credentials" SET "passwordChangedAt" = "updatedAt";
ALTER TABLE "local_credentials"
  ALTER COLUMN "passwordChangedAt" SET NOT NULL,
  ALTER COLUMN "passwordChangedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- 2. 기본키를 userId 로 — 사람마다 비밀번호 하나를 기본키가 지킨다(따로 둔 id 와 unique 는 겹침)
ALTER TABLE "local_credentials" DROP CONSTRAINT "local_credentials_pkey";
ALTER TABLE "local_credentials" DROP COLUMN "id";
DROP INDEX "local_credentials_userId_key";
ALTER TABLE "local_credentials" ADD CONSTRAINT "local_credentials_pkey" PRIMARY KEY ("userId");

-- 3. 자리를 옮긴 컬럼 — 토큰·인증(one_time_codes · users."emailVerifiedAt"),
--    2FA(two_factor_methods), 잠금(auth_lockouts)
DROP INDEX "local_credentials_passwordResetToken_key";
DROP INDEX "local_credentials_verificationToken_key";
ALTER TABLE "local_credentials"
  DROP COLUMN "passwordResetToken",
  DROP COLUMN "resetTokenExpiry",
  DROP COLUMN "verificationToken",
  DROP COLUMN "verificationTokenExpiry",
  DROP COLUMN "isVerified",
  DROP COLUMN "totpEnabled",
  DROP COLUMN "totpSecret",
  DROP COLUMN "emailOtpEnabled",
  DROP COLUMN "failedAttempts",
  DROP COLUMN "lockedUntil";

-- 4. one_time_codes 로 합쳐진 테이블. 진행 중이던 코드는 확장 단계에서 이미 옮기지 않았다
--    (해시 방식이 달라 옮길 수 없고, 길어야 10분분이다).
DROP TABLE "two_factor_challenges";
DROP TABLE "email_change_requests";
