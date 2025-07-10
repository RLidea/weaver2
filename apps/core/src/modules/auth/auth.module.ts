import { Module } from '@nestjs/common';
import { SignInController } from './controllers/sign-in.controller';
import { SignInService } from './services/sign-in.service';
import { LocalStrategy } from './strategy/local.strategy';
import { JwtStrategy } from './strategy/jwt.strategy';
import { UserModule } from '../user/user.module';
import { SignUpController } from './controllers/sign-up.controller';
import { SignUpService } from './services/sign-up.service';
import { EmailModule } from '../email/email.module';
import { PasswordResetController } from './controllers/password-reset.controller';
import { RequestPasswordResetService } from './services/request-password-reset.service';
import { ResetPasswordService } from './services/reset-password.service';
import { PrismaModule } from '@weaver2/prisma';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SignOutController } from './controllers/sign-out.controller';
import { SignOutService } from './services/sign-out.service';
import { TermsService } from '../terms/services/terms.service';

@Module({
  imports: [PrismaModule, UserModule, EmailModule],
  controllers: [
    SignInController,
    SignUpController,
    PasswordResetController,
    SignOutController,
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
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [SignInService],
})
export class AuthModule {}
