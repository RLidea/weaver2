import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '@weaver2/prisma';
import { HealthCheckApiController } from './controllers/health-check.api.controller';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthCheckApiController],
})
export class HealthApiModule {}
