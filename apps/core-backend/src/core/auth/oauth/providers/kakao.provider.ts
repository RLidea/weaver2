import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OAuthProvider,
  OAuthTokens,
  OAuthUserProfile,
} from '../interfaces/oauth-provider.interface';

interface KakaoTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface KakaoUserResponse {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

@Injectable()
export class KakaoOAuthProvider implements OAuthProvider {
  readonly name = 'kakao';

  constructor(private readonly configService: ConfigService) {}

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.configService.get<string>('KAKAO_CLIENT_ID') ?? '',
      redirect_uri: this.configService.get<string>('KAKAO_CALLBACK_URL') ?? '',
      response_type: 'code',
      state,
      scope: 'profile_nickname,account_email',
    });
    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const res = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.configService.get<string>('KAKAO_CLIENT_ID') ?? '',
        client_secret:
          this.configService.get<string>('KAKAO_CLIENT_SECRET') ?? '',
        redirect_uri:
          this.configService.get<string>('KAKAO_CALLBACK_URL') ?? '',
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) {
      const error = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new UnauthorizedException(
        `Kakao token exchange failed: ${error.error ?? res.statusText}`,
      );
    }
    const data = (await res.json()) as KakaoTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiry: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const res = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new UnauthorizedException(
        `Failed to fetch Kakao user profile: ${res.statusText}`,
      );
    }
    const data = (await res.json()) as KakaoUserResponse;

    const email = data.kakao_account?.email;
    if (!email) {
      throw new BadRequestException(
        '카카오 로그인에는 이메일 동의가 필요합니다.',
      );
    }

    return {
      provider: this.name,
      providerId: String(data.id),
      email,
      displayName:
        data.kakao_account?.profile?.nickname ?? `kakao_${String(data.id)}`,
      profileImageUrl: data.kakao_account?.profile?.profile_image_url,
    };
  }
}
