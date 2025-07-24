import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { AdminDashboardApiController } from './controllers/admin-dashboard.api.controller';
import { AdminDashboardApiService } from './services/admin-dashboard.api.service';
import { AdminContentApiController } from './controllers/admin-content.api.controller';
import { AdminContentApiService } from './services/admin-content.api.service';
import { BoardModule } from '../../../features/board/board.module';

@Module({
  imports: [PrismaModule, BoardModule],
  controllers: [AdminDashboardApiController, AdminContentApiController],
  providers: [AdminDashboardApiService, AdminContentApiService],
})
export class AdminApiModule {}
