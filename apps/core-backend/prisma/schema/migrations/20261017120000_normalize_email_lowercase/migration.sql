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

-- 1-b. ASCII 가 아닌 글자가 든 이메일이 있으면 멈춘다.
--      Postgres lower() 는 DB 로케일(LC_CTYPE)을 따른다 — C 로케일이면 É 같은 글자를 그대로 두어,
--      앱(JS toLowerCase)이 만든 값과 어긋나 그 사용자가 로그인하지 못한다. 사람이 보고 고친다.
--      확인: SELECT id, email FROM users WHERE email ~ '[^\x01-\x7F]';
DO $$
DECLARE
  non_ascii text;
BEGIN
  SELECT string_agg(email, ', ')
    INTO non_ascii
    FROM users
   WHERE email ~ '[^\x01-\x7F]';

  IF non_ascii IS NOT NULL THEN
    RAISE EXCEPTION
      'normalize_email_lowercase: ASCII 가 아닌 글자가 든 이메일이 있습니다 — 로케일에 따라 소문자화가 앱과 어긋나므로 먼저 확인하세요: %',
      non_ascii;
  END IF;
END $$;

-- 2. 기존 값을 소문자로
UPDATE users SET email = lower(trim(email)) WHERE email <> lower(trim(email));
-- 소문자로 바꾸면 이미 있는 계정과 겹치는 대기 중 변경 요청은 확정할 수 없으니 지운다(유효 10분)
DELETE FROM email_change_requests r USING users u WHERE lower(trim(r."newEmail")) = u.email;
UPDATE email_change_requests SET "newEmail" = lower(trim("newEmail")) WHERE "newEmail" <> lower(trim("newEmail"));

-- 3. 앞으로 대문자가 들어오지 못하게
--    ADD CONSTRAINT 는 테이블을 잠그고 전체를 훑는다. 사용자가 아주 많으면 NOT VALID 로 건 뒤
--    VALIDATE CONSTRAINT 로 따로 검증하는 편이 잠금이 짧다.
ALTER TABLE users ADD CONSTRAINT users_email_lowercase CHECK (email = lower(email));
ALTER TABLE email_change_requests ADD CONSTRAINT email_change_requests_new_email_lowercase CHECK ("newEmail" = lower("newEmail"));
