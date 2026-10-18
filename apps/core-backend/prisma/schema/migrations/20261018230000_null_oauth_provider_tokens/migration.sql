-- OAuth 공급자 토큰을 비운다. 로그인 때 저장만 하고 읽는 곳이 없었다 —
-- 쓰지 않으면 모으지 않는다. DB 가 새면 공급자 계정까지 위험해진다.
-- 칸은 남긴다(스키마 변경 없음). 공급자 API 를 부를 파생 프로젝트가 암호화해 다시 쓸 자리.
UPDATE "oauth_accounts" SET "accessToken" = NULL, "refreshToken" = NULL, "tokenExpiry" = NULL;
