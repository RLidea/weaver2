import { Module } from '@nestjs/common';
import { AdminAuthViewController } from './controllers/admin-auth.view-controller';
import { AdminDashboardViewController } from './controllers/admin-dashboard.view-controller';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [AuthModule, UserModule],
  controllers: [AdminAuthViewController, AdminDashboardViewController],
  providers: [],
})
export class AdminModule {}
