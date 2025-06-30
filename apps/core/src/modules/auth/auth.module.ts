import { Module } from '@nestjs/common';
import { SignInController } from './controllers/sign-in.controller';
import { SignInService } from './services/sign-in.service';
import { PrismaModule } from '@weaver2/prisma';
import { LocalStrategy } from './strategy/local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constant/jwt.constants';
import { JwtStrategy } from './strategy/jwt.strategy';
import { UserModule } from '../user/user.module';
import { SignUpController } from './controllers/sign-up.controller';
import { SignUpService } from './services/sign-up.service';
import { EmailModule } from '../email/email.module';

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
  controllers: [SignInController, SignUpController],
  providers: [SignInService, SignUpService, LocalStrategy, JwtStrategy],
  exports: [SignInService],
})
export class AuthModule {}
