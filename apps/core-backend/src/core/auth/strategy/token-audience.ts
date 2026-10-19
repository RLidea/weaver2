/**
 * 우리가 찍는 JWT 의 종류. `aud` 클레임에 넣고, **검증할 때 반드시 요구**한다.
 *
 * 액세스 토큰과 pre-auth 토큰은 같은 JWT_SECRET 으로 서명된다. 종류를 검증하지 않으면
 * 비밀번호만 아는 사람이 2FA 를 건너뛰고 받은 pre-auth 토큰을 `access_token` 쿠키에
 * 넣어 그 사람으로 행세할 수 있다. 예전에는 `type: 'pre-auth'` 클레임을 두고 읽는 쪽이
 * 「pre-auth 가 아닌지」를 각자 확인했는데, 확인을 빠뜨린 자리(공개 라우트의 선택적
 * 인증)가 그대로 구멍이 됐다. `aud` 는 jsonwebtoken 이 검증 단계에서 거절하므로 읽는
 * 쪽이 잊을 수 없다.
 *
 * - 액세스 토큰: JwtModule 의 기본 sign·verify 옵션이 `ACCESS` 를 쓴다
 *   (core.module.ts). 그래서 `jwtService.sign({ sub })` 는 그대로 액세스 토큰이다.
 * - pre-auth 토큰: 찍을 때와 읽을 때 `PRE_AUTH` 를 명시한다 (two-factor.service.ts).
 */
export const TOKEN_AUDIENCE = {
  ACCESS: 'access',
  PRE_AUTH: 'pre-auth',
  /** SSO 로그인 진행 쿠키(oidc_tx) — 키도 JWT_SECRET 에서 따로 뽑는다 (oidc-transaction.ts) */
  OIDC_TX: 'oidc-tx',
} as const;
