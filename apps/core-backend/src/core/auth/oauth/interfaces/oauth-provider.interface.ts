export interface OAuthUserProfile {
  provider: string;
  providerId: string;
  email: string;
  displayName: string;
  profileImageUrl?: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  /** OpenID Connect id_token — 사용자 정보 API 가 없는 provider(Apple)가 쓴다 */
  idToken?: string;
}

/** 콜백 요청에 code·state 말고 함께 실려 오는 값 */
export interface OAuthCallbackExtras {
  /** Apple 이 첫 승인 때 한 번만 보내는 사용자 JSON (`{ name: { firstName, lastName } }`) */
  user?: string;
}

export interface OAuthProvider {
  readonly name: string;
  /** 콜백이 POST(form_post)로 오면 true — state 쿠키를 크로스사이트로 실어야 한다 */
  readonly usesFormPost?: boolean;
  getAuthorizationUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
  getUserProfile(
    tokens: OAuthTokens,
    extras?: OAuthCallbackExtras,
  ): Promise<OAuthUserProfile>;
}
