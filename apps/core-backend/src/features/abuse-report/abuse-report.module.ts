import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { PermissionModule } from '../../core/permission/permission.module';
import { AbuseReportController } from './controllers/abuse-report.controller';
import { AbuseReportAdminController } from './controllers/abuse-report-admin.controller';
import { ModerationController } from './controllers/moderation.controller';
import { AbuseReportService } from './services/abuse-report.service';
import { ModerationService } from './services/moderation.service';

@Module({
  imports: [PrismaModule, PermissionModule],
  controllers: [
    AbuseReportController,
    AbuseReportAdminController,
    ModerationController,
  ],
  providers: [AbuseReportService, ModerationService],
})
export class AbuseReportModule {}
