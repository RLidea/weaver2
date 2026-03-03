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
}

export interface OAuthProvider {
  readonly name: string;
  getAuthorizationUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
  getUserProfile(accessToken: string): Promise<OAuthUserProfile>;
}
