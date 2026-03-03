import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class AnalyticsSchedulerService {
  private readonly logger = new Logger(AnalyticsSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 매월 1일 오전 2시에 이전 달 리포트 생성
  @Cron('0 2 1 * *')
  async generateMonthlyReport() {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth() + 1;

    this.logger.log(`Generating monthly report for ${year}-${month}`);

    try {
      await this.createMonthlyAnalyticsReport(year, month);
      await this.cleanupOldPageViewLogs();

      this.logger.log(
        `Monthly report generated successfully for ${year}-${month}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate monthly report for ${year}-${month}:`,
        error,
      );
    }
  }

  // 매일 오전 3시에 30일 이전 로그 정리
  @Cron('0 3 * * *')
  async cleanupOldLogs() {
    this.logger.log('Starting daily log cleanup');

    try {
      await this.cleanupOldPageViewLogs();
      this.logger.log('Daily log cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup old logs:', error);
    }
  }

  private async createMonthlyAnalyticsReport(year: number, month: number) {
    // 해당 월의 시작과 끝 날짜
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 이미 리포트가 존재하는지 확인
    const existingReport = await this.prisma.monthlyAnalyticsReport.findUnique({
      where: {
        year_month: {
          year,
          month,
        },
      },
    });

    if (existingReport) {
      this.logger.warn(`Report for ${year}-${month} already exists, skipping`);
      return;
    }

    // 기본 통계 수집
    const [
      totalPageViews,
      uniqueVisitors,
      dailyStats,
      topPages,
      trafficSources,
    ] = await Promise.all([
      // 총 페이지뷰 수
      this.prisma.pageView.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // 고유 방문자 수 (userId 기준)
      this.prisma.pageView
        .groupBy({
          by: ['userId'],
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
            userId: {
              not: null,
            },
          },
        })
        .then((result) => result.length),

      // 일별 통계
      this.getDailyStats(startDate, endDate),

      // 인기 페이지
      this.getTopPages(startDate, endDate),

      // 트래픽 소스 (referrer 기반)
      this.getTrafficSources(startDate, endDate),
    ]);

    const dailyTrends = this.formatDailyTrends(dailyStats);
    const dailyAvgViews = totalPageViews / new Date(year, month, 0).getDate();
    const peakDailyViews = Math.max(...Object.values(dailyTrends));

    // 월간 리포트 저장
    await this.prisma.monthlyAnalyticsReport.create({
      data: {
        year,
        month,
        totalPageViews,
        uniqueVisitors,
        dailyAvgViews: Math.round(dailyAvgViews * 100) / 100,
        peakDailyViews,
        topPages,
        trafficSources,
        dailyTrends,
      },
    });
  }

  private async getDailyStats(startDate: Date, endDate: Date) {
    const result = await this.prisma.$queryRaw<
      Array<{ date: string; count: bigint }>
    >`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM "PageView"
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    return result.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));
  }

  private async getTopPages(startDate: Date, endDate: Date) {
    const result = await this.prisma.pageView.groupBy({
      by: ['pageUrl'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        pageUrl: true,
      },
      orderBy: {
        _count: {
          pageUrl: 'desc',
        },
      },
      take: 10,
    });

    const topPages: Record<string, number> = {};
    result.forEach((item) => {
      topPages[item.pageUrl] = item._count.pageUrl;
    });

    return topPages;
  }

  private async getTrafficSources(startDate: Date, endDate: Date) {
    const result = await this.prisma.pageView.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        referrer: true,
      },
    });

    const sources = {
      direct: 0,
      search: 0,
      social: 0,
      referral: 0,
    };

    result.forEach((view) => {
      const referrer = view.referrer;
      if (!referrer || referrer === '') {
        sources.direct++;
      } else if (
        referrer.includes('google.com') ||
        referrer.includes('naver.com') ||
        referrer.includes('bing.com')
      ) {
        sources.search++;
      } else if (
        referrer.includes('facebook.com') ||
        referrer.includes('twitter.com') ||
        referrer.includes('instagram.com')
      ) {
        sources.social++;
      } else {
        sources.referral++;
      }
    });

    return sources;
  }

  private formatDailyTrends(
    dailyStats: Array<{ date: string; count: number }>,
  ) {
    const trends: Record<string, number> = {};
    dailyStats.forEach((stat) => {
      trends[stat.date] = stat.count;
    });
    return trends;
  }

  private async cleanupOldPageViewLogs() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleteResult = await this.prisma.pageView.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    this.logger.log(`Cleaned up ${deleteResult.count} old page view logs`);
  }

  // 수동으로 리포트 생성하는 메서드 (테스트용)
  async generateReportManually(year: number, month: number) {
    this.logger.log(`Manually generating report for ${year}-${month}`);
    await this.createMonthlyAnalyticsReport(year, month);
  }
}
