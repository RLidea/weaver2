import { Controller, Get, Query, Param, Delete } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../../features/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { EmailStatus } from '@prisma/client';
import { AdminNotificationsApiService } from '../services/admin-notifications.api.service';
import { PaginationRequestDto } from '@weaver2/pagination/dto/pagination-request.dto';

@ApiTags('Admin Notifications')
@Controller({ path: 'admin/notifications', version: '1' })
@RequirePermission(PERMISSIONS.EMAIL.LOG_READ)
export class AdminNotificationsApiController {
  constructor(
    private readonly adminNotificationsApiService: AdminNotificationsApiService,
  ) {}

  // ============ Email Logs ============
  @Get('email-logs')
  @ApiOperation({ summary: 'Get email logs with filtering and pagination' })
  async getEmailLogs(
    @Query() paginationDto: PaginationRequestDto,
    @Query('status') status?: EmailStatus,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.adminNotificationsApiService.getEmailLogs({
      pagination: paginationDto,
      status,
      userId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      search,
    });
  }

  @Get('email-logs/:logId')
  @ApiOperation({ summary: 'Get email log details' })
  async getEmailLogDetails(@Param('logId') logId: string) {
    return this.adminNotificationsApiService.getEmailLogDetails(logId);
  }

  @Delete('email-logs/:logId')
  @ApiOperation({ summary: 'Delete email log (Admin only)' })
  async deleteEmailLog(@Param('logId') logId: string) {
    return this.adminNotificationsApiService.deleteEmailLog(logId);
  }

  // ============ Statistics ============
  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  async getNotificationStats() {
    return this.adminNotificationsApiService.getNotificationStats();
  }

  @Get('stats/email')
  @ApiOperation({ summary: 'Get email statistics' })
  async getEmailStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.adminNotificationsApiService.getEmailStats({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }
}
