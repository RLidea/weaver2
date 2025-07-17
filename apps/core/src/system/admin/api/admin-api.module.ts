import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { AdminDashboardApiController } from './controllers/admin-dashboard.api.controller';
import { AdminDashboardApiService } from './services/admin-dashboard.api.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminDashboardApiController],
  providers: [AdminDashboardApiService],
})
export class AdminApiModule {}
