/**
 * OpenID Connect Back-Channel Logout 1.0 — 손님 쪽. 발급자가 서버에서 서버로 POST 하는 logout_token 을 받는다.
 *
 * 서명 · 머리 · iss · aud · 시각은 포트(`OidcClient.verifyLogoutToken`)가 jose 로 본다. 여기는 그 뒤의
 * 클레임 규칙(§2.6 4~6 · §2.4)만 — 라이브러리 없이 시험할 수 있게 함수로 둔다.
 */

/** `events` 에 있어야 하는 열쇠 */
export const BACKCHANNEL_LOGOUT_EVENT =
  'http://schemas.openid.net/event/backchannel-logout';

/** 머리의 `typ` (§2.4) */
export const LOGOUT_TOKEN_TYPE = 'logout+jwt';

/**
 * 받아 주는 나이(초) — `iat` 가 이보다 오래면 거절한다. jti 를 이 기간만큼 쥐고 있으므로 재사용 거절이
 * 빈틈없이 덮는다. accounts 는 다시 보낼 때마다 새로 서명하므로(새 iat · jti) 오래 걸린 재시도도 닿는다
 */
export const LOGOUT_TOKEN_MAX_AGE_SEC = 10 * 60;

/** jti · sid · sub 의 길이 상한 — 엉뚱하게 긴 값을 DB 에 넣지 않는다 */
const MAX_ID_LENGTH = 255;

/** 받을 수 없는 토큰 — 400 `invalid_request`. 메시지에는 어느 규칙인지만 싣고 토큰은 싣지 않는다 */
export class LogoutTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LogoutTokenError';
  }
}

/** 검증을 지난 logout_token 에서 쓰는 것 */
export interface LogoutTokenClaims {
  jti: string;
  /** 초 */
  iat: number;
  sid?: string;
  sub?: string;
}

function optionalId(
  payload: Record<string, unknown>,
  name: string,
): string | undefined {
  const value = payload[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value || value.length > MAX_ID_LENGTH) {
    throw new LogoutTokenError(`"${name}" is not a usable string`);
  }
  return value;
}

/**
 * §2.6 의 클레임 규칙. 서명 · iss · aud · iat · exp 는 이미 지났다고 본다.
 *
 * - `events` 는 객체이고 `BACKCHANNEL_LOGOUT_EVENT` 열쇠의 값도 객체다
 * - `nonce` 가 없다 — id_token 을 logout_token 으로 내미는 것을 막는다
 * - `sid` 나 `sub` 가 있다. `sid` 면 그 세션 하나, `sub` 만이면 그 사람의 세션 전부를 지우라는 뜻이다
 *   (발급자는 비밀번호 변경 · 재설정 · 탈퇴에 sub 만 보낸다)
 * - `jti` 가 있다(재사용 거절에 쓴다)
 */
export function checkLogoutClaims(
  payload: Record<string, unknown>,
): LogoutTokenClaims {
  const events = payload.events;
  if (
    !events ||
    typeof events !== 'object' ||
    Array.isArray(events) ||
    !(BACKCHANNEL_LOGOUT_EVENT in events)
  ) {
    throw new LogoutTokenError('"events" has no back-channel logout event');
  }
  const event = (events as Record<string, unknown>)[BACKCHANNEL_LOGOUT_EVENT];
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new LogoutTokenError('back-channel logout event is not an object');
  }
  if ('nonce' in payload) {
    throw new LogoutTokenError('"nonce" must be absent');
  }
  const jti = optionalId(payload, 'jti');
  if (!jti) throw new LogoutTokenError('"jti" is missing');
  const sid = optionalId(payload, 'sid');
  const sub = optionalId(payload, 'sub');
  if (!sid && !sub) {
    throw new LogoutTokenError('neither "sid" nor "sub"');
  }
  if (typeof payload.iat !== 'number') {
    throw new LogoutTokenError('"iat" is missing');
  }
  return { jti, iat: payload.iat, sid, sub };
}
