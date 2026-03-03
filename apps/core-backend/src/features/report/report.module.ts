import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { PermissionModule } from '../../core/permission/permission.module';
import { ReportController } from './controllers/report.controller';
import { ReportAdminController } from './controllers/report-admin.controller';
import { ModerationController } from './controllers/moderation.controller';
import { ReportService } from './services/report.service';
import { ModerationService } from './services/moderation.service';

@Module({
  imports: [PrismaModule, PermissionModule],
  controllers: [ReportController, ReportAdminController, ModerationController],
  providers: [ReportService, ModerationService],
})
export class ReportModule {}
