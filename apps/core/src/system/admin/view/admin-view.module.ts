import { Module } from '@nestjs/common';
import { AdminAuthViewController } from './controllers/admin-auth.view-controller';
import { AdminDashboardViewController } from './controllers/admin-dashboard.view-controller';

@Module({
  controllers: [AdminAuthViewController, AdminDashboardViewController],
})
export class AdminViewModule {}
