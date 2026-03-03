import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

export interface PageViewData {
  pageUrl: string;
  userId?: string | null;
  ipAddress?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class PageViewLoggingService {
  private readonly logger = new Logger(PageViewLoggingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 페이지뷰 로그를 저장합니다
   */
  async logPageView(data: PageViewData): Promise<void> {
    try {
      await this.prisma.pageView.create({
        data: {
          pageUrl: data.pageUrl,
          userId: data.userId || null,
          ipAddress: data.ipAddress || null,
          referrer: data.referrer || null,
          userAgent: data.userAgent || null,
        },
      });

      this.logger.debug(
        `Page view logged: ${data.pageUrl} by user ${data.userId || 'anonymous'}`,
      );
    } catch (error) {
      this.logger.error('Failed to log page view:', error);
      // 로깅 실패가 애플리케이션 동작을 방해하지 않도록 에러를 던지지 않음
    }
  }

  /**
   * 최근 30일간의 페이지뷰 통계를 가져옵니다
   */
  async getRecentPageViewStats(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const result = await this.prisma.$queryRaw<
        Array<{ date: string; views: bigint }>
      >`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as views
        FROM "PageView"
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date
      `;

      return result.map((row) => ({
        date: row.date,
        views: Number(row.views),
      }));
    } catch (error) {
      this.logger.error('Failed to get recent page view stats:', error);
      return [];
    }
  }

  /**
   * 최근 30일간의 인기 페이지를 가져옵니다
   */
  async getTopPages(limit: number = 10) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    try {
      const result = await this.prisma.pageView.groupBy({
        by: ['pageUrl'],
        where: {
          createdAt: {
            gte: startDate,
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
        take: limit,
      });

      return result.map((item) => ({
        pageUrl: item.pageUrl,
        views: item._count.pageUrl,
      }));
    } catch (error) {
      this.logger.error('Failed to get top pages:', error);
      return [];
    }
  }

  /**
   * 최근 30일간의 트래픽 소스를 분석합니다
   */
  async getTrafficSources() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    try {
      const result = await this.prisma.pageView.findMany({
        where: {
          createdAt: {
            gte: startDate,
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
        } else if (this.isSearchEngine(referrer)) {
          sources.search++;
        } else if (this.isSocialMedia(referrer)) {
          sources.social++;
        } else {
          sources.referral++;
        }
      });

      const total =
        sources.direct + sources.search + sources.social + sources.referral;

      if (total === 0) {
        return { direct: 0, search: 0, social: 0, referral: 0 };
      }

      return {
        direct: Math.round((sources.direct / total) * 100),
        search: Math.round((sources.search / total) * 100),
        social: Math.round((sources.social / total) * 100),
        referral: Math.round((sources.referral / total) * 100),
      };
    } catch (error) {
      this.logger.error('Failed to get traffic sources:', error);
      return { direct: 0, search: 0, social: 0, referral: 0 };
    }
  }

  /**
   * 월간 리포트 데이터를 가져옵니다
   */
  async getMonthlyReport(year: number, month: number) {
    try {
      return await this.prisma.monthlyAnalyticsReport.findUnique({
        where: {
          year_month: {
            year,
            month,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get monthly report for ${year}-${month}:`,
        error,
      );
      return null;
    }
  }

  /**
   * 최근 몇 개월의 리포트 목록을 가져옵니다
   */
  async getRecentMonthlyReports(months: number = 12) {
    try {
      return await this.prisma.monthlyAnalyticsReport.findMany({
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: months,
      });
    } catch (error) {
      this.logger.error('Failed to get recent monthly reports:', error);
      return [];
    }
  }

  private isSearchEngine(referrer: string): boolean {
    const searchEngines = [
      'google.com',
      'naver.com',
      'daum.net',
      'bing.com',
      'yahoo.com',
      'duckduckgo.com',
      'baidu.com',
    ];
    return searchEngines.some((engine) => referrer.includes(engine));
  }

  private isSocialMedia(referrer: string): boolean {
    const socialMedia = [
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'linkedin.com',
      'youtube.com',
      'tiktok.com',
      'kakao.com',
      'naver.com/blog',
    ];
    return socialMedia.some((social) => referrer.includes(social));
  }
}
