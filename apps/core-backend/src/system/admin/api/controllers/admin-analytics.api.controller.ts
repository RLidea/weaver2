import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import {
  AdminAnalyticsApiService,
  TimeRangeFilter,
} from '../services/admin-analytics.api.service';
import { AdminAnalyticsRangeQueryDto } from '../dto/admin-analytics-range-query.dto';

function toTimeRangeFilter(
  query: AdminAnalyticsRangeQueryDto,
): TimeRangeFilter {
  const filter: TimeRangeFilter = {};
  if (query.from) filter.from = new Date(query.from);
  if (query.to) filter.to = new Date(query.to);
  return filter;
}

@ApiTags('Admin Analytics')
@Controller({
  path: 'admin/analytics',
  version: '1',
})
@RequirePermission(PERMISSIONS.ANALYTICS.READ)
export class AdminAnalyticsApiController {
  constructor(
    private readonly adminAnalyticsApiService: AdminAnalyticsApiService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: '분석 개요 조회 (대시보드용)' })
  async getOverview(@Query() query: AdminAnalyticsRangeQueryDto) {
    const filter = toTimeRangeFilter(query);

    const data = await this.adminAnalyticsApiService.getOverview(filter);

    return {
      success: true,
      message: 'Analytics overview retrieved successfully',
      data,
    };
  }

  @Get('users')
  @ApiOperation({ summary: '사용자 분석 상세 조회' })
  async getUserAnalytics(@Query() query: AdminAnalyticsRangeQueryDto) {
    const filter = toTimeRangeFilter(query);

    const data = await this.adminAnalyticsApiService.getUserAnalytics(filter);

    return {
      success: true,
      message: 'User analytics retrieved successfully',
      data,
    };
  }

  @Get('content')
  @ApiOperation({ summary: '콘텐츠 분석 상세 조회' })
  async getContentAnalytics(@Query() query: AdminAnalyticsRangeQueryDto) {
    const filter = toTimeRangeFilter(query);

    const data =
      await this.adminAnalyticsApiService.getContentAnalytics(filter);

    return {
      success: true,
      message: 'Content analytics retrieved successfully',
      data,
    };
  }

  @Get('system')
  @ApiOperation({ summary: '시스템 성능 분석 조회' })
  getSystemAnalytics() {
    const data = this.adminAnalyticsApiService.getSystemAnalytics();

    return {
      success: true,
      message: 'System analytics retrieved successfully',
      data,
    };
  }

  @Get('summary')
  @ApiOperation({ summary: '종합 분석 요약 조회' })
  async getAnalyticsSummary(@Query() query: AdminAnalyticsRangeQueryDto) {
    const filter = toTimeRangeFilter(query);

    const [overview, users, content] = await Promise.all([
      this.adminAnalyticsApiService.getOverview(filter),
      this.adminAnalyticsApiService.getUserAnalytics(filter),
      this.adminAnalyticsApiService.getContentAnalytics(filter),
    ]);
    const system = this.adminAnalyticsApiService.getSystemAnalytics();

    return {
      success: true,
      message: 'Analytics summary retrieved successfully',
      data: {
        overview,
        users,
        content,
        system,
      },
    };
  }
}
