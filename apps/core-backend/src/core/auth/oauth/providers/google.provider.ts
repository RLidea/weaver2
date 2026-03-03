import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OAuthProvider,
  OAuthTokens,
  OAuthUserProfile,
} from '../interfaces/oauth-provider.interface';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface GoogleUserResponse {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class GoogleOAuthProvider implements OAuthProvider {
  readonly name = 'google';

  constructor(private readonly configService: ConfigService) {}

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.configService.get<string>('GOOGLE_CLIENT_ID') ?? '',
      redirect_uri: this.configService.get<string>('GOOGLE_CALLBACK_URL') ?? '',
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.configService.get<string>('GOOGLE_CLIENT_ID') ?? '',
        client_secret:
          this.configService.get<string>('GOOGLE_CLIENT_SECRET') ?? '',
        redirect_uri:
          this.configService.get<string>('GOOGLE_CALLBACK_URL') ?? '',
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) {
      const error = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new UnauthorizedException(
        `Google token exchange failed: ${error.error ?? res.statusText}`,
      );
    }
    const data = (await res.json()) as GoogleTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiry: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new UnauthorizedException(
        `Failed to fetch Google user profile: ${res.statusText}`,
      );
    }
    const data = (await res.json()) as GoogleUserResponse;
    return {
      provider: this.name,
      providerId: data.id,
      email: data.email,
      displayName: data.name,
      profileImageUrl: data.picture,
    };
  }
}
