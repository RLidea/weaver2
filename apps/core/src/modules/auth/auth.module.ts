import { Module } from '@nestjs/common';
import { SignInController } from './controllers/sign-in.controller';
import { SignInService } from './services/sign-in.service';
import { LocalStrategy } from './strategy/local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constant/jwt.constants';
import { JwtStrategy } from './strategy/jwt.strategy';
import { UserModule } from '../user/user.module';
import { SignUpController } from './controllers/sign-up.controller';
import { SignUpService } from './services/sign-up.service';
import { EmailModule } from '../email/email.module';
import { PasswordResetController } from './controllers/password-reset.controller';
import { RequestPasswordResetService } from './services/request-password-reset.service';
import { ResetPasswordService } from './services/reset-password.service';
import { PrismaModule } from '@weaver2/prisma';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '1h' },
    }),
    UserModule,
    EmailModule,
  ],
  controllers: [SignInController, SignUpController, PasswordResetController],
  providers: [
    SignInService,
    SignUpService,
    LocalStrategy,
    JwtStrategy,
    RequestPasswordResetService,
    ResetPasswordService,
  ],
  exports: [SignInService],
})
export class AuthModule {}
