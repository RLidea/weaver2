import { Controller, Get, Query, Param, Delete } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../../features/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { EmailStatus } from '@prisma/client';
import { AdminNotificationsApiService } from '../services/admin-notifications.api.service';
import { OffsetRequestDto } from '@weaver2/pagination';

@ApiTags('Admin Notifications')
@Controller({ path: 'admin/notifications', version: '1' })
@RequirePermission(PERMISSIONS.EMAIL.LOG_READ)
export class AdminNotificationsApiController {
  constructor(
    private readonly adminNotificationsApiService: AdminNotificationsApiService,
  ) {}

  // ============ Email Logs ============
  @Get('email-logs')
  @ApiOperation({ summary: '이메일 로그 조회 (필터링, 페이지네이션)' })
  async getEmailLogs(
    @Query() paginationDto: OffsetRequestDto,
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
  @ApiOperation({ summary: '이메일 로그 상세 조회' })
  async getEmailLogDetails(@Param('logId') logId: string) {
    return this.adminNotificationsApiService.getEmailLogDetails(logId);
  }

  @Delete('email-logs/:logId')
  @ApiOperation({ summary: '이메일 로그 삭제 (관리자 전용)' })
  async deleteEmailLog(@Param('logId') logId: string) {
    return this.adminNotificationsApiService.deleteEmailLog(logId);
  }

  // ============ Statistics ============
  @Get('stats')
  @ApiOperation({ summary: '알림 통계 조회' })
  async getNotificationStats() {
    return this.adminNotificationsApiService.getNotificationStats();
  }

  @Get('stats/email')
  @ApiOperation({ summary: '이메일 통계 조회' })
  async getEmailStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.adminNotificationsApiService.getEmailStats({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }
}
