import { SetMetadata } from '@nestjs/common';

/** 경로가 열리는 로그인 방식. 전역 `AuthModeGuard` 가 읽는다 */
export const AUTH_MODE_ONLY_KEY = 'authModeOnly';

/**
 * 로컬 로그인에만 있는 경로 — `AUTH_MODE=sso` 면 404 `AUTH_MODE_SSO`.
 * 비밀번호 로그인 · 가입 · 재설정 · 2FA · OAuth · 이메일 · 비밀번호 바꾸기처럼 신원을 이 앱이
 * 직접 다루는 경로에 붙인다. 코드는 지우지 않는다 — 되돌리기(`AUTH_MODE=local`) 길이다.
 */
export const LocalAuthOnly = () => SetMetadata(AUTH_MODE_ONLY_KEY, 'local');
