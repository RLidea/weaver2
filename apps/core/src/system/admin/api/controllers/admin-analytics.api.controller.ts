import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  AdminAnalyticsApiService,
  TimeRangeFilter,
} from '../services/admin-analytics.api.service';

@ApiTags('Admin Analytics')
@Controller({
  path: 'admin/analytics',
  version: '1',
})
@Roles(Role.ADMIN, Role.DEVELOPER)
export class AdminAnalyticsApiController {
  constructor(
    private readonly adminAnalyticsApiService: AdminAnalyticsApiService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get analytics overview (for dashboard)' })
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
  @ApiOperation({ summary: 'Get detailed user analytics' })
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
  @ApiOperation({ summary: 'Get detailed content analytics' })
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
  @ApiOperation({ summary: 'Get system performance analytics' })
  getSystemAnalytics() {
    const data = this.adminAnalyticsApiService.getSystemAnalytics();

    return {
      success: true,
      message: 'System analytics retrieved successfully',
      data,
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get comprehensive analytics summary' })
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
