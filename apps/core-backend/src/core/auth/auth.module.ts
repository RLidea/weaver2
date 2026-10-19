import { Module } from '@nestjs/common';
import { SignInController } from './controllers/sign-in.controller';
import { SignInService } from './services/sign-in.service';
import { LocalStrategy } from './strategy/local.strategy';
import { JwtStrategy } from './strategy/jwt.strategy';
import { UserModule } from '../user/user.module';
import { SignUpController } from './controllers/sign-up.controller';
import { SignUpService } from './services/sign-up.service';
import { EmailModule } from '../../infrastructure/email/email.module';
import { PasswordResetController } from './controllers/password-reset.controller';
import { RequestPasswordResetService } from './services/request-password-reset.service';
import { ResetPasswordService } from './services/reset-password.service';
import { PrismaModule } from '@weaver2/prisma';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionGuard } from '../permission/guards/permission.guard';
import { SignOutController } from './controllers/sign-out.controller';
import { SignOutService } from './services/sign-out.service';
import { TermsService } from '../terms/services/terms.service';
import { OAuthModule } from './oauth/oauth.module';
import { OAuthController } from './controllers/oauth.controller';
import { AuthProvidersController } from './controllers/auth-providers.controller';
import { TwoFactorController } from './controllers/two-factor.controller';
import { TwoFactorService } from './services/two-factor.service';
import { SignInCompletionService } from './services/sign-in-completion.service';
import { SessionController } from './controllers/session.controller';
import { SessionService } from './services/session.service';
import { CsrfController } from './controllers/csrf.controller';
import { OneTimeCodeModule } from './one-time-code/one-time-code.module';
import { ApiTokenModule } from './api-token/api-token.module';
import { AuthModeModule } from './auth-mode.module';
import { AuthModeGuard } from './guards/auth-mode.guard';
import { OidcModule } from './oidc/oidc.module';
import { OidcController } from './oidc/oidc.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModeModule,
    UserModule,
    EmailModule,
    OAuthModule,
    OneTimeCodeModule,
    ApiTokenModule,
    OidcModule,
  ],
  controllers: [
    SignInController,
    SignUpController,
    PasswordResetController,
    SignOutController,
    OAuthController,
    TwoFactorController,
    SessionController,
    CsrfController,
    AuthProvidersController,
    OidcController,
  ],
  providers: [
    SignInService,
    SignUpService,
    LocalStrategy,
    JwtStrategy,
    RequestPasswordResetService,
    ResetPasswordService,
    SignOutService,
    TermsService,
    TwoFactorService,
    SignInCompletionService,
    SessionService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 인증 다음 — 닫힌 경로(@LocalAuthOnly · @SsoOnly)는 404. 인증보다 뒤라야 API 토큰의
    // 「범위 없는 경로는 늘 401」 계약이 지켜진다. 공개 경로는 인증을 지나 여기서 404 가 된다
    {
      provide: APP_GUARD,
      useClass: AuthModeGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
  exports: [SignInService, SignInCompletionService, TwoFactorService],
})
export class AuthModule {}
