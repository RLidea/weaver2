import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { AUTH_MODE_CONFIG, AuthModeConfig } from '../auth-mode';
import { OIDC_CLIENT, OpenIdOidcClient } from './oidc-client';
import { OidcTransaction } from './oidc-transaction';
import { OidcSubjectService } from './oidc-subject.service';

/**
 * SSO(OIDC 손님) 부품. 컨트롤러는 세션을 주는 `SignInCompletionService` 가 있는 AuthModule 에
 * 둔다 — 여기서 AuthModule 을 import 하면 순환이 된다.
 * `AUTH_MODE=local` 이면 `OIDC_CLIENT` 는 null 이다(경로는 @SsoOnly 가 404 로 막는다).
 */
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: OIDC_CLIENT,
      useFactory: (authMode: AuthModeConfig) =>
        authMode.mode === 'sso' ? new OpenIdOidcClient(authMode) : null,
      inject: [AUTH_MODE_CONFIG],
    },
    OidcTransaction,
    OidcSubjectService,
  ],
  exports: [OIDC_CLIENT, OidcTransaction, OidcSubjectService],
})
export class OidcModule {}
