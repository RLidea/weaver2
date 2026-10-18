import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../../core/permission/decorators/require-permission.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import {
  AdminAnalyticsApiService,
  TimeRangeFilter,
} from '../services/admin-analytics.api.service';
import { AdminAnalyticsRangeQueryDto } from '../dto/admin-analytics-range-query.dto';
import {
  AnalyticsOverviewDto,
  AnalyticsSummaryDto,
  ContentAnalyticsDto,
  SystemAnalyticsDto,
  UserAnalyticsDto,
} from '../dto/admin-analytics-response.dto';

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

  // 값을 그대로 돌려준다 — SuccessInterceptor 가 { message, data } 로 감싼다.
  // 여기서 { success, message, data } 로 또 싸면 화면이 받는 data 가 { success, data } 가 된다
  @Get('overview')
  @ApiOperation({ summary: '분석 개요 조회 (대시보드용)' })
  @ApiOkResponse({ type: AnalyticsOverviewDto })
  async getOverview(
    @Query() query: AdminAnalyticsRangeQueryDto,
  ): Promise<AnalyticsOverviewDto> {
    const filter = toTimeRangeFilter(query);

    const data = await this.adminAnalyticsApiService.getOverview(filter);

    return data;
  }

  @Get('users')
  @ApiOperation({ summary: '사용자 분석 상세 조회' })
  @ApiOkResponse({ type: UserAnalyticsDto })
  async getUserAnalytics(
    @Query() query: AdminAnalyticsRangeQueryDto,
  ): Promise<UserAnalyticsDto> {
    const filter = toTimeRangeFilter(query);

    const data = await this.adminAnalyticsApiService.getUserAnalytics(filter);

    return data;
  }

  @Get('content')
  @ApiOperation({ summary: '콘텐츠 분석 상세 조회' })
  @ApiOkResponse({ type: ContentAnalyticsDto })
  async getContentAnalytics(
    @Query() query: AdminAnalyticsRangeQueryDto,
  ): Promise<ContentAnalyticsDto> {
    const filter = toTimeRangeFilter(query);

    const data =
      await this.adminAnalyticsApiService.getContentAnalytics(filter);

    return data;
  }

  @Get('system')
  @ApiOperation({ summary: '시스템 성능 분석 조회' })
  @ApiOkResponse({ type: SystemAnalyticsDto })
  getSystemAnalytics(): SystemAnalyticsDto {
    const data = this.adminAnalyticsApiService.getSystemAnalytics();

    return data;
  }

  @Get('summary')
  @ApiOperation({ summary: '종합 분석 요약 조회' })
  @ApiOkResponse({ type: AnalyticsSummaryDto })
  async getAnalyticsSummary(
    @Query() query: AdminAnalyticsRangeQueryDto,
  ): Promise<AnalyticsSummaryDto> {
    const filter = toTimeRangeFilter(query);

    const [overview, users, content] = await Promise.all([
      this.adminAnalyticsApiService.getOverview(filter),
      this.adminAnalyticsApiService.getUserAnalytics(filter),
      this.adminAnalyticsApiService.getContentAnalytics(filter),
    ]);
    const system = this.adminAnalyticsApiService.getSystemAnalytics();

    return { overview, users, content, system };
  }
}
