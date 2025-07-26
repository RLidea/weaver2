import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { AdminDashboardApiController } from './controllers/admin-dashboard.api.controller';
import { AdminDashboardApiService } from './services/admin-dashboard.api.service';
import { AdminContentApiController } from './controllers/admin-content.api.controller';
import { AdminContentApiService } from './services/admin-content.api.service';
import { AdminNotificationsApiController } from './controllers/admin-notifications.api.controller';
import { AdminNotificationsApiService } from './services/admin-notifications.api.service';
import { AdminAnalyticsApiController } from './controllers/admin-analytics.api.controller';
import { AdminAnalyticsApiService } from './services/admin-analytics.api.service';
import { BoardModule } from '../../../features/board/board.module';
import { EmailModule } from '../../../infrastructure/email/email.module';

@Module({
  imports: [PrismaModule, BoardModule, EmailModule],
  controllers: [
    AdminDashboardApiController,
    AdminContentApiController,
    AdminNotificationsApiController,
    AdminAnalyticsApiController,
  ],
  providers: [
    AdminDashboardApiService,
    AdminContentApiService,
    AdminNotificationsApiService,
    AdminAnalyticsApiService,
  ],
})
export class AdminApiModule {}
