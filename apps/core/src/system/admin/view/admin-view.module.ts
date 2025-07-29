import { Module } from '@nestjs/common';
import { AdminAuthViewController } from './controllers/admin-auth.view-controller';
import { AdminDashboardViewController } from './controllers/admin-dashboard.view-controller';
import { AuthModule } from '../../../features/auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [AdminAuthViewController, AdminDashboardViewController],
})
export class AdminViewModule {}
