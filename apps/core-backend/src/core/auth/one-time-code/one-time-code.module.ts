import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { OneTimeCodeService } from './one-time-code.service';
import { OneTimeCodeScheduler } from './one-time-code.scheduler';

/**
 * 인증(재설정·가입 인증·2FA)과 사용자(이메일 변경)가 함께 쓴다. UserModule 이 AuthModule 에
 * 들어 있어 AuthModule 안에 두면 순환이 생기므로 따로 둔다.
 */
@Module({
  imports: [PrismaModule],
  providers: [OneTimeCodeService, OneTimeCodeScheduler],
  exports: [OneTimeCodeService],
})
export class OneTimeCodeModule {}
