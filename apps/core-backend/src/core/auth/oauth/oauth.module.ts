import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '@weaver2/prisma';
import { OAuthProviderRegistry } from './oauth-provider.registry';
import { OAuthService } from './oauth.service';
import { GoogleOAuthProvider } from './providers/google.provider';
import { KakaoOAuthProvider } from './providers/kakao.provider';
import { NaverOAuthProvider } from './providers/naver.provider';
import { AppleOAuthProvider } from './providers/apple.provider';

@Module({
  imports: [PrismaModule],
  providers: [
    OAuthProviderRegistry,
    OAuthService,
    GoogleOAuthProvider,
    KakaoOAuthProvider,
    NaverOAuthProvider,
    AppleOAuthProvider,
    {
      provide: 'OAUTH_PROVIDERS_INIT',
      useFactory: (
        registry: OAuthProviderRegistry,
        google: GoogleOAuthProvider,
        kakao: KakaoOAuthProvider,
        naver: NaverOAuthProvider,
        apple: AppleOAuthProvider,
        config: ConfigService,
      ) => {
        registry.register(google);
        registry.register(kakao);
        registry.register(naver);
        // Apple 은 Developer 멤버십(Services ID·키)이 있어야 켤 수 있다 — 기본 꺼짐
        if (config.get<string>('APPLE_OAUTH_ENABLED') === 'true') {
          registry.register(apple);
        }
      },
      inject: [
        OAuthProviderRegistry,
        GoogleOAuthProvider,
        KakaoOAuthProvider,
        NaverOAuthProvider,
        AppleOAuthProvider,
        ConfigService,
      ],
    },
  ],
  exports: [OAuthService],
})
export class OAuthModule {}
