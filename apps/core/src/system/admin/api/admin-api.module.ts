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
import { AdminSecurityApiController } from './controllers/admin-security.api.controller';
import { AdminSecurityApiService } from './services/admin-security.api.service';
import { BoardModule } from '../../../features/board/board.module';
import { EmailModule } from '../../../infrastructure/email/email.module';
import { AnalyticsModule } from '../../../infrastructure/analytics/analytics.module';

@Module({
  imports: [PrismaModule, BoardModule, EmailModule, AnalyticsModule],
  controllers: [
    AdminDashboardApiController,
    AdminContentApiController,
    AdminNotificationsApiController,
    AdminAnalyticsApiController,
    AdminSecurityApiController,
  ],
  providers: [
    AdminDashboardApiService,
    AdminContentApiService,
    AdminNotificationsApiService,
    AdminAnalyticsApiService,
    AdminSecurityApiService,
  ],
})
export class AdminApiModule {}
