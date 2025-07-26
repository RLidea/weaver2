import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { Role } from '@prisma/client';
import { PageViewLoggingService } from '../../../../infrastructure/analytics/page-view-logging.service';

export interface TimeRangeFilter {
  from?: Date;
  to?: Date;
}

export interface AnalyticsOverview {
  totalUsers: number;
  todaySignups: number;
  totalPosts: number;
  todayPosts: number;
  totalComments: number;
  todayComments: number;
  activeUsers: number;
  trafficOverview?: Array<{ date: string; views: number }>;
  trafficSources?: {
    direct: number;
    search: number;
    social: number;
    referral: number;
  };
}

export interface UserAnalytics {
  signupTrends: Array<{ date: string; count: number }>;
  usersByRole: Array<{ role: Role; count: number }>;
  userActivity: Array<{ date: string; activeUsers: number }>;
  retentionRate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface ContentAnalytics {
  postTrends: Array<{ date: string; posts: number; comments: number }>;
  topBoards: Array<{
    boardName: string;
    postCount: number;
    commentCount: number;
  }>;
  contentQuality: {
    avgPostLength: number;
    avgCommentsPerPost: number;
    postsWithImages: number;
  };
}

export interface SystemAnalytics {
  apiResponseTimes: Array<{ endpoint: string; avgResponseTime: number }>;
  errorRates: Array<{ statusCode: number; count: number }>;
  trafficPatterns: Array<{ hour: number; requestCount: number }>;
}

@Injectable()
export class AdminAnalyticsApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pageViewLoggingService: PageViewLoggingService,
  ) {}

  // ============ 핵심 요약 (Dashboard용) ============
  async getOverview(filter?: TimeRangeFilter): Promise<AnalyticsOverview> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 기본 필터 설정
    const timeFilter = filter || {
      from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30일 전
      to: now,
    };

    const [
      totalUsers,
      todaySignups,
      totalPosts,
      todayPosts,
      totalComments,
      todayComments,
      activeUsers,
    ] = await Promise.all([
      // 전체 사용자 수
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: timeFilter.from
            ? { gte: timeFilter.from, lte: timeFilter.to }
            : undefined,
        },
      }),

      // 오늘 가입자 수
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: today,
          },
        },
      }),

      // 전체 게시물 수
      this.prisma.post.count({
        where: {
          createdAt: timeFilter.from
            ? { gte: timeFilter.from, lte: timeFilter.to }
            : undefined,
        },
      }),

      // 오늘 게시물 수
      this.prisma.post.count({
        where: {
          createdAt: {
            gte: today,
          },
        },
      }),

      // 전체 댓글 수
      this.prisma.comment.count({
        where: {
          createdAt: timeFilter.from
            ? { gte: timeFilter.from, lte: timeFilter.to }
            : undefined,
        },
      }),

      // 오늘 댓글 수
      this.prisma.comment.count({
        where: {
          createdAt: {
            gte: today,
          },
        },
      }),

      // 활성 사용자 (최근 7일간 로그인한 사용자)
      this.prisma.user.count({
        where: {
          deletedAt: null,
          lastLoginAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // 실제 트래픽 데이터 가져오기
    const [trafficOverview, trafficSources] = await Promise.all([
      this.pageViewLoggingService.getRecentPageViewStats(30),
      this.pageViewLoggingService.getTrafficSources(),
    ]);

    return {
      totalUsers,
      todaySignups,
      totalPosts,
      todayPosts,
      totalComments,
      todayComments,
      activeUsers,
      trafficOverview,
      trafficSources,
    };
  }

  // ============ 사용자 분석 ============
  async getUserAnalytics(filter?: TimeRangeFilter): Promise<UserAnalytics> {
    const now = new Date();
    const timeFilter = filter || {
      from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      to: now,
    };

    const [signupTrends, usersByRole, userActivity] = await Promise.all([
      // 가입 트렌드 (일별)
      this.getSignupTrends(timeFilter),
      // 역할별 사용자 분포
      this.getUsersByRole(),

      // 사용자 활동 (일별 활성 사용자)
      this.getUserActivity(timeFilter),
    ]);

    // 리텐션 계산
    const retentionRate = await this.calculateRetentionRate();

    return {
      signupTrends,
      usersByRole,
      userActivity,
      retentionRate,
    };
  }

  // ============ 콘텐츠 분석 ============
  async getContentAnalytics(
    filter?: TimeRangeFilter,
  ): Promise<ContentAnalytics> {
    const now = new Date();
    const timeFilter = filter || {
      from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      to: now,
    };

    const [postTrends, topBoards, contentQuality] = await Promise.all([
      // 게시물/댓글 트렌드
      this.getPostTrends(timeFilter),

      // 인기 게시판
      this.getTopBoards(timeFilter),

      // 콘텐츠 품질 지표
      this.getContentQuality(timeFilter),
    ]);

    return {
      postTrends,
      topBoards,
      contentQuality,
    };
  }

  // ============ 시스템 분석 ============
  getSystemAnalytics(): SystemAnalytics {
    // 실제 환경에서는 로그 시스템에서 데이터를 가져와야 함
    // 지금은 모의 데이터로 구현
    return {
      apiResponseTimes: [
        { endpoint: '/v1/posts', avgResponseTime: 120 },
        { endpoint: '/v1/users', avgResponseTime: 95 },
        { endpoint: '/v1/auth/sign-in', avgResponseTime: 200 },
        { endpoint: '/v1/boards', avgResponseTime: 80 },
      ],
      errorRates: [
        { statusCode: 200, count: 45230 },
        { statusCode: 404, count: 1205 },
        { statusCode: 401, count: 890 },
        { statusCode: 500, count: 45 },
      ],
      trafficPatterns: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        requestCount: Math.floor(Math.random() * 1000) + 100,
      })),
    };
  }

  // ============ Private Helper Methods ============
  private async getSignupTrends(
    filter: TimeRangeFilter,
  ): Promise<Array<{ date: string; count: number }>> {
    const days = Math.ceil(
      (filter.to!.getTime() - filter.from!.getTime()) / (24 * 60 * 60 * 1000),
    );
    const trends: Array<{ date: string; count: number }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(filter.from!.getTime() + i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const count = await this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      trends.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }

    return trends;
  }

  private async getUsersByRole() {
    const users = await this.prisma.user.groupBy({
      by: ['role'],
      where: {
        deletedAt: null,
      },
      _count: {
        role: true,
      },
    });

    return users.map((item) => ({
      role: item.role,
      count: item._count.role,
    }));
  }

  private async getUserActivity(
    filter: TimeRangeFilter,
  ): Promise<Array<{ date: string; activeUsers: number }>> {
    const days = Math.ceil(
      (filter.to!.getTime() - filter.from!.getTime()) / (24 * 60 * 60 * 1000),
    );
    const activity: Array<{ date: string; activeUsers: number }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(filter.from!.getTime() + i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const activeUsers = await this.prisma.user.count({
        where: {
          deletedAt: null,
          lastLoginAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      activity.push({
        date: date.toISOString().split('T')[0],
        activeUsers,
      });
    }

    return activity;
  }

  private async calculateRetentionRate() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, dailyActive, weeklyActive, monthlyActive] =
      await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({
          where: { deletedAt: null, lastLoginAt: { gte: oneDayAgo } },
        }),
        this.prisma.user.count({
          where: { deletedAt: null, lastLoginAt: { gte: oneWeekAgo } },
        }),
        this.prisma.user.count({
          where: { deletedAt: null, lastLoginAt: { gte: oneMonthAgo } },
        }),
      ]);

    return {
      daily: totalUsers > 0 ? (dailyActive / totalUsers) * 100 : 0,
      weekly: totalUsers > 0 ? (weeklyActive / totalUsers) * 100 : 0,
      monthly: totalUsers > 0 ? (monthlyActive / totalUsers) * 100 : 0,
    };
  }

  private async getPostTrends(
    filter: TimeRangeFilter,
  ): Promise<Array<{ date: string; posts: number; comments: number }>> {
    const days = Math.ceil(
      (filter.to!.getTime() - filter.from!.getTime()) / (24 * 60 * 60 * 1000),
    );
    const trends: Array<{ date: string; posts: number; comments: number }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(filter.from!.getTime() + i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const [posts, comments] = await Promise.all([
        this.prisma.post.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
        this.prisma.comment.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
      ]);

      trends.push({
        date: date.toISOString().split('T')[0],
        posts,
        comments,
      });
    }

    return trends;
  }

  private async getTopBoards(filter: TimeRangeFilter) {
    const boards = await this.prisma.board.findMany({
      select: {
        name: true,
        _count: {
          select: {
            posts: {
              where: {
                createdAt: filter.from
                  ? { gte: filter.from, lte: filter.to }
                  : undefined,
              },
            },
          },
        },
        posts: {
          select: {
            _count: {
              select: {
                comments: true,
              },
            },
          },
          where: {
            createdAt: filter.from
              ? { gte: filter.from, lte: filter.to }
              : undefined,
          },
        },
      },
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    return boards.map((board) => ({
      boardName: board.name,
      postCount: board._count.posts,
      commentCount: board.posts.reduce(
        (sum, post) => sum + post._count.comments,
        0,
      ),
    }));
  }

  private async getContentQuality(filter: TimeRangeFilter) {
    // 댓글 수를 포함한 게시물 정보 조회
    const postsWithComments = await this.prisma.post.findMany({
      select: {
        content: true,
        comments: {
          select: {
            id: true,
          },
        },
      },
      where: {
        createdAt: filter.from
          ? { gte: filter.from, lte: filter.to }
          : undefined,
      },
    });

    const totalPosts = postsWithComments.length;
    if (totalPosts === 0) {
      return {
        avgPostLength: 0,
        avgCommentsPerPost: 0,
        postsWithImages: 0, // 현재 스키마에 image 필드가 없으므로 0으로 설정
      };
    }

    const avgPostLength =
      postsWithComments.reduce(
        (sum, post) => sum + (post.content?.length || 0),
        0,
      ) / totalPosts;
    const avgCommentsPerPost =
      postsWithComments.reduce((sum, post) => sum + post.comments.length, 0) /
      totalPosts;

    // 현재 스키마에 image 필드가 없으므로 0으로 설정
    // 나중에 이미지 필드가 추가되면 이 부분을 수정할 수 있습니다
    const postsWithImages = 0;

    return {
      avgPostLength: Math.round(avgPostLength),
      avgCommentsPerPost: Math.round(avgCommentsPerPost * 100) / 100,
      postsWithImages,
    };
  }
}
