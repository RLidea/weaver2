import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { ApiTokenService } from './api-token.service';
import { AdminApiTokenController } from './controllers/admin-api-token.controller';

/** 범위 토큰. 인증 가드(JwtAuthGuard)가 ApiTokenService 로 토큰을 확인한다 */
@Module({
  imports: [PrismaModule],
  controllers: [AdminApiTokenController],
  providers: [ApiTokenService],
  exports: [ApiTokenService],
})
export class ApiTokenModule {}
