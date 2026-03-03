import { Module } from '@nestjs/common';
import { HealthApiModule } from './api/health-api.module';
import { HealthViewModule } from './view/health-view.module';

@Module({
  imports: [HealthApiModule, HealthViewModule],
})
export class HealthModule {}
