import { Module } from '@nestjs/common';
import { HealthDashboardViewController } from './controllers/health-dashboard.view.controller';

@Module({
  controllers: [HealthDashboardViewController],
})
export class HealthViewModule {}
