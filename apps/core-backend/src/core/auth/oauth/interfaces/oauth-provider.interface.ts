export interface OAuthUserProfile {
  provider: string;
  providerId: string;
  email: string;
  /**
   * 공급자가 이 이메일의 주인임을 확인했는지. 새 사용자의 users."emailVerifiedAt" 을 정한다.
   * 파생 프로젝트가 공급자를 더하면 그 공급자의 값을 옮긴다 — 모르면 false.
   */
  emailVerified: boolean;
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
