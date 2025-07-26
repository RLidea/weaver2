import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@weaver2/prisma';
import { AnalyticsSchedulerService } from './analytics-scheduler.service';
import { PageViewLoggingService } from './page-view-logging.service';
import { AnalyticsTrackingController } from './controllers/analytics-tracking.controller';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(), // Task scheduling 활성화
  ],
  controllers: [
    AnalyticsTrackingController, // 트래킹 API 컨트롤러 추가
  ],
  providers: [AnalyticsSchedulerService, PageViewLoggingService],
  exports: [
    PageViewLoggingService, // 다른 모듈에서 사용할 수 있도록 export
  ],
})
export class AnalyticsModule {}
