import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { RequirePermission } from '../../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import {
  AdminAnalyticsApiService,
  TimeRangeFilter,
} from '../services/admin-analytics.api.service';

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
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date (ISO string)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date (ISO string)',
  })
  async getOverview(@Query('from') from?: string, @Query('to') to?: string) {
    const filter: TimeRangeFilter = {};
    if (from) filter.from = new Date(from);
    if (to) filter.to = new Date(to);

    const data = await this.adminAnalyticsApiService.getOverview(filter);

    return {
      success: true,
      message: 'Analytics overview retrieved successfully',
      data,
    };
  }

  @Get('users')
  @ApiOperation({ summary: '사용자 분석 상세 조회' })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date (ISO string)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date (ISO string)',
  })
  async getUserAnalytics(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const filter: TimeRangeFilter = {};
    if (from) filter.from = new Date(from);
    if (to) filter.to = new Date(to);

    const data = await this.adminAnalyticsApiService.getUserAnalytics(filter);

    return {
      success: true,
      message: 'User analytics retrieved successfully',
      data,
    };
  }

  @Get('content')
  @ApiOperation({ summary: '콘텐츠 분석 상세 조회' })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date (ISO string)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date (ISO string)',
  })
  async getContentAnalytics(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const filter: TimeRangeFilter = {};
    if (from) filter.from = new Date(from);
    if (to) filter.to = new Date(to);

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
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date (ISO string)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date (ISO string)',
  })
  async getAnalyticsSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const filter: TimeRangeFilter = {};
    if (from) filter.from = new Date(from);
    if (to) filter.to = new Date(to);

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
