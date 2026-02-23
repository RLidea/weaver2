import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OAuthProvider,
  OAuthTokens,
  OAuthUserProfile,
} from '../interfaces/oauth-provider.interface';

interface NaverTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface NaverUserResponse {
  resultcode: string;
  message: string;
  response: {
    id: string;
    email?: string;
    name?: string;
    profile_image?: string;
  };
}

@Injectable()
export class NaverOAuthProvider implements OAuthProvider {
  readonly name = 'naver';

  constructor(private readonly configService: ConfigService) {}

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.configService.get<string>('NAVER_CLIENT_ID') ?? '',
      redirect_uri: this.configService.get<string>('NAVER_CALLBACK_URL') ?? '',
      response_type: 'code',
      state,
    });
    return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const res = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.configService.get<string>('NAVER_CLIENT_ID') ?? '',
        client_secret:
          this.configService.get<string>('NAVER_CLIENT_SECRET') ?? '',
        redirect_uri:
          this.configService.get<string>('NAVER_CALLBACK_URL') ?? '',
        grant_type: 'authorization_code',
      }),
    });
    const data = (await res.json()) as NaverTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiry: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const res = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json()) as NaverUserResponse;

    const email = data.response?.email;
    if (!email) {
      throw new BadRequestException(
        '네이버 로그인에는 이메일 동의가 필요합니다.',
      );
    }

    return {
      provider: this.name,
      providerId: data.response.id,
      email,
      displayName: data.response.name ?? `naver_${data.response.id}`,
      profileImageUrl: data.response.profile_image,
    };
  }
}
