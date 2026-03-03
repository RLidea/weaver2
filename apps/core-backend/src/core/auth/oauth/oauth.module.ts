import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { OAuthProviderRegistry } from './oauth-provider.registry';
import { OAuthService } from './oauth.service';
import { GoogleOAuthProvider } from './providers/google.provider';
import { KakaoOAuthProvider } from './providers/kakao.provider';
import { NaverOAuthProvider } from './providers/naver.provider';

@Module({
  imports: [PrismaModule],
  providers: [
    OAuthProviderRegistry,
    OAuthService,
    GoogleOAuthProvider,
    KakaoOAuthProvider,
    NaverOAuthProvider,
    {
      provide: 'OAUTH_PROVIDERS_INIT',
      useFactory: (
        registry: OAuthProviderRegistry,
        google: GoogleOAuthProvider,
        kakao: KakaoOAuthProvider,
        naver: NaverOAuthProvider,
      ) => {
        registry.register(google);
        registry.register(kakao);
        registry.register(naver);
      },
      inject: [
        OAuthProviderRegistry,
        GoogleOAuthProvider,
        KakaoOAuthProvider,
        NaverOAuthProvider,
      ],
    },
  ],
  exports: [OAuthService],
})
export class OAuthModule {}
