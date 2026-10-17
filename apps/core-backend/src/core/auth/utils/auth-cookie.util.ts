import { CookieOptions, Request, Response } from 'express';

/**
 * 인증 쿠키(access_token / refresh_token) 세팅·삭제를 한 곳에 통합한다.
 *
 * 이전에는 setAuthCookies가 sign-in / two-factor 컨트롤러에 중복 정의되고 oauth·admin은
 * 인라인으로 세팅해, 옵션이 조금씩 어긋날 위험이 있었다. 특히 clearCookie는 세팅 때와 동일한
 * path/sameSite/secure를 주지 않으면 삭제가 안 되는 함정이 있어, 세팅과 삭제를 짝으로 묶는다.
 */

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15분

function baseCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string; tokenExpiry: number },
  isProduction: boolean,
): void {
  const base = baseCookieOptions(isProduction);
  res.cookie('access_token', tokens.accessToken, {
    ...base,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });
  res.cookie('refresh_token', tokens.refreshToken, {
    ...base,
    maxAge: tokens.tokenExpiry,
  });
}

/** access_token만 갱신(admin 뷰의 refresh 후 access 재발급 등에서 refresh 쿠키는 별도 처리). */
export function setAccessTokenCookie(
  res: Response,
  accessToken: string,
  isProduction: boolean,
): void {
  res.cookie('access_token', accessToken, {
    ...baseCookieOptions(isProduction),
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response, isProduction: boolean): void {
  // clearCookie는 세팅 때와 동일 옵션(path/sameSite/secure)을 줘야 실제로 삭제된다.
  const base = baseCookieOptions(isProduction);
  res.clearCookie('access_token', base);
  res.clearCookie('refresh_token', base);
}

/**
 * 2FA 대기 표시(pre-auth 토큰). 응답 본문이 아니라 쿠키로 나른다 — OAuth 콜백은 리다이렉트라
 * 본문에 토큰을 실을 수 없고, 쿠키여야 비밀번호·OAuth 가 같은 2FA 화면을 쓴다.
 *
 * Path 를 `/v1/auth/2fa` 로 좁히지 않는다. 브라우저는 Next 의 `/api` 리라이트 **앞의**
 * 주소(`/api/v1/auth/2fa/…`)로 쿠키 경로를 맞추므로, 백엔드가 보는 경로로 좁히면 쿠키가
 * 영영 안 간다. 토큰이 aud 로 묶여 있어(pre-auth) 넓은 경로가 위험을 늘리지 않는다.
 */
export const PRE_AUTH_COOKIE = 'pre_auth';
const PRE_AUTH_MAX_AGE_MS = 5 * 60 * 1000; // 토큰 수명과 같다

export function setPreAuthCookie(
  res: Response,
  preAuthToken: string,
  isProduction: boolean,
): void {
  res.cookie(PRE_AUTH_COOKIE, preAuthToken, {
    ...baseCookieOptions(isProduction),
    maxAge: PRE_AUTH_MAX_AGE_MS,
  });
}

export function clearPreAuthCookie(res: Response, isProduction: boolean): void {
  res.clearCookie(PRE_AUTH_COOKIE, baseCookieOptions(isProduction));
}

export function readPreAuthCookie(req: Request): string | undefined {
  const value = (req.cookies as Record<string, unknown> | undefined)?.[
    PRE_AUTH_COOKIE
  ];
  return typeof value === 'string' ? value : undefined;
}
