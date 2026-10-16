-- 이메일을 소문자로 저장한다 — `Victim@x.com` 과 `victim@x.com` 이 다른 계정이 되지 않게.
-- 앱은 들어오는 입구와 저장소에서 소문자로 바꾸고(core/auth/utils/email.util.ts),
-- DB 는 CHECK 제약으로 그 약속을 지킨다. Prisma 는 CHECK 제약을 관리하지 않지만 지우지도 않는다.

-- 1. 소문자로 바꿨을 때 겹치는 계정이 있으면 멈춘다.
--    어느 계정을 남길지는 사람이 정할 일이라 자동으로 합치지 않는다.
--    확인: SELECT lower(trim(email)), array_agg(id) FROM users GROUP BY 1 HAVING count(*) > 1;
DO $$
DECLARE
  duplicates text;
BEGIN
  SELECT string_agg(normalized, ', ')
    INTO duplicates
    FROM (
      SELECT lower(trim(email)) AS normalized
        FROM users
       GROUP BY 1
      HAVING count(*) > 1
    ) d;

  IF duplicates IS NOT NULL THEN
    RAISE EXCEPTION
      'normalize_email_lowercase: 대소문자만 다른 이메일 계정이 있습니다 — 먼저 정리하세요: %',
      duplicates;
  END IF;
END $$;

-- 2. 기존 값을 소문자로
UPDATE users SET email = lower(trim(email)) WHERE email <> lower(trim(email));
UPDATE email_change_requests SET "newEmail" = lower(trim("newEmail")) WHERE "newEmail" <> lower(trim("newEmail"));

-- 3. 앞으로 대문자가 들어오지 못하게
ALTER TABLE users ADD CONSTRAINT users_email_lowercase CHECK (email = lower(email));
ALTER TABLE email_change_requests ADD CONSTRAINT email_change_requests_new_email_lowercase CHECK ("newEmail" = lower("newEmail"));
