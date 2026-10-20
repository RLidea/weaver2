export interface JwtPayload {
  sub: string; // userId
  /** SSO 로그인의 id_token sid — 있을 때만 싣는다. back-channel 로그아웃 묘비와 맞춰 본다 */
  sid?: string;
  iat?: number;
  exp?: number;
}
