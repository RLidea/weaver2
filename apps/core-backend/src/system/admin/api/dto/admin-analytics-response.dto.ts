import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 분석 API 의 응답 모양. SuccessInterceptor 가 { message, data } 로 감싸므로 여기 적는 것은 data 다.

export class DailyViewsDto {
  @ApiProperty({ example: '2026-10-18' })
  date: string;

  @ApiProperty()
  views: number;
}

export class TrafficSourcesDto {
  @ApiProperty()
  direct: number;

  @ApiProperty()
  search: number;

  @ApiProperty()
  social: number;

  @ApiProperty()
  referral: number;
}

export class AnalyticsOverviewDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  todaySignups: number;

  @ApiProperty()
  totalPosts: number;

  @ApiProperty()
  todayPosts: number;

  @ApiProperty()
  totalComments: number;

  @ApiProperty()
  todayComments: number;

  @ApiProperty()
  activeUsers: number;

  @ApiPropertyOptional({ type: [DailyViewsDto] })
  trafficOverview?: DailyViewsDto[];

  @ApiPropertyOptional({ type: TrafficSourcesDto })
  trafficSources?: TrafficSourcesDto;
}

export class DailyCountDto {
  @ApiProperty({ example: '2026-10-18' })
  date: string;

  @ApiProperty()
  count: number;
}

export class GroupCountDto {
  @ApiProperty()
  group: string;

  @ApiProperty()
  count: number;
}

export class DailyActiveUsersDto {
  @ApiProperty({ example: '2026-10-18' })
  date: string;

  @ApiProperty()
  activeUsers: number;
}

export class RetentionRateDto {
  @ApiProperty()
  daily: number;

  @ApiProperty()
  weekly: number;

  @ApiProperty()
  monthly: number;
}

export class UserAnalyticsDto {
  @ApiProperty({ type: [DailyCountDto] })
  signupTrends: DailyCountDto[];

  @ApiProperty({ type: [GroupCountDto] })
  usersByGroup: GroupCountDto[];

  @ApiProperty({ type: [DailyActiveUsersDto] })
  userActivity: DailyActiveUsersDto[];

  @ApiProperty({ type: RetentionRateDto })
  retentionRate: RetentionRateDto;
}

export class DailyPostsDto {
  @ApiProperty({ example: '2026-10-18' })
  date: string;

  @ApiProperty()
  posts: number;

  @ApiProperty()
  comments: number;
}

export class TopBoardDto {
  @ApiProperty()
  boardName: string;

  @ApiProperty()
  postCount: number;

  @ApiProperty()
  commentCount: number;
}

export class ContentQualityDto {
  @ApiProperty()
  avgPostLength: number;

  @ApiProperty()
  avgCommentsPerPost: number;

  @ApiProperty()
  postsWithImages: number;
}

export class ContentAnalyticsDto {
  @ApiProperty({ type: [DailyPostsDto] })
  postTrends: DailyPostsDto[];

  @ApiProperty({ type: [TopBoardDto] })
  topBoards: TopBoardDto[];

  @ApiProperty({ type: ContentQualityDto })
  contentQuality: ContentQualityDto;
}

export class EndpointResponseTimeDto {
  @ApiProperty()
  endpoint: string;

  @ApiProperty()
  avgResponseTime: number;
}

export class StatusCodeCountDto {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  count: number;
}

export class HourlyRequestsDto {
  @ApiProperty()
  hour: number;

  @ApiProperty()
  requestCount: number;
}

export class SystemAnalyticsDto {
  @ApiProperty({ type: [EndpointResponseTimeDto] })
  apiResponseTimes: EndpointResponseTimeDto[];

  @ApiProperty({ type: [StatusCodeCountDto] })
  errorRates: StatusCodeCountDto[];

  @ApiProperty({ type: [HourlyRequestsDto] })
  trafficPatterns: HourlyRequestsDto[];
}

export class AnalyticsSummaryDto {
  @ApiProperty({ type: AnalyticsOverviewDto })
  overview: AnalyticsOverviewDto;

  @ApiProperty({ type: UserAnalyticsDto })
  users: UserAnalyticsDto;

  @ApiProperty({ type: ContentAnalyticsDto })
  content: ContentAnalyticsDto;

  @ApiProperty({ type: SystemAnalyticsDto })
  system: SystemAnalyticsDto;
}
