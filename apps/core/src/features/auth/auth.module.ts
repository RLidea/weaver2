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
import { TwoFactorController } from './controllers/two-factor.controller';
import { TwoFactorService } from './services/two-factor.service';

@Module({
  imports: [PrismaModule, UserModule, EmailModule, OAuthModule],
  controllers: [
    SignInController,
    SignUpController,
    PasswordResetController,
    SignOutController,
    OAuthController,
    TwoFactorController,
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
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
  exports: [SignInService],
})
export class AuthModule {}
