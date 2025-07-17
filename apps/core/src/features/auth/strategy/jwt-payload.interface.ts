export interface JwtPayload {
  sub: string; // userId
  authId: string;
  iat?: number;
  exp?: number;
}
