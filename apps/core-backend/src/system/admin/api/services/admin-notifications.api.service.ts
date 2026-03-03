import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { OffsetPaginationService, OffsetRequestDto } from '@weaver2/pagination';
import { EmailLogService } from '../../../../infrastructure/email/services/email-log.service';
import { Prisma, EmailStatus } from '@prisma/client';

interface EmailLogsFilterOptions {
  pagination: OffsetRequestDto;
  status?: EmailStatus;
  userId?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

interface EmailStatsOptions {
  from?: Date;
  to?: Date;
}

@Injectable()
export class AdminNotificationsApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailLogService: EmailLogService,
  ) {}

  // ============ Email Logs Management ============
  async getEmailLogs(options: EmailLogsFilterOptions) {
    const { pagination, status, userId, from, to, search } = options;

    const where: Prisma.EmailLogWhereInput = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }
    if (search) {
      where.OR = [
        { to: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { from: { contains: search, mode: 'insensitive' } },
      ];
    }

    return OffsetPaginationService.buildFromPrisma({
      prisma: this.prisma.emailLog,
      options: pagination,
      where,
      include: {
        template: { select: { id: true, name: true } },
        user: { select: { id: true, username: true, displayName: true } },
      },
    });
  }

  async getEmailLogDetails(logId: string) {
    const emailLog = await this.prisma.emailLog.findUnique({
      where: { id: logId },
      include: {
        template: true,
        user: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    if (!emailLog) {
      throw new Error('Email log not found');
    }

    return emailLog;
  }

  async deleteEmailLog(logId: string) {
    return this.prisma.emailLog.delete({
      where: { id: logId },
    });
  }

  // ============ Statistics ============
  async getNotificationStats() {
    const [totalEmails, sentEmails, failedEmails, pendingEmails, recentEmails] =
      await Promise.all([
        this.prisma.emailLog.count(),
        this.prisma.emailLog.count({ where: { status: EmailStatus.SENT } }),
        this.prisma.emailLog.count({ where: { status: EmailStatus.FAILED } }),
        this.prisma.emailLog.count({ where: { status: EmailStatus.PENDING } }),
        this.prisma.emailLog.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            },
          },
        }),
      ]);

    return {
      overview: {
        totalEmails,
        sentEmails,
        failedEmails,
        pendingEmails,
        recentEmails,
        successRate: totalEmails > 0 ? (sentEmails / totalEmails) * 100 : 0,
      },
    };
  }

  async getEmailStats(options: EmailStatsOptions = {}) {
    const { from, to } = options;

    const whereCondition: Prisma.EmailLogWhereInput = {};

    if (from || to) {
      whereCondition.createdAt = {};
      if (from) whereCondition.createdAt.gte = from;
      if (to) whereCondition.createdAt.lte = to;
    }

    const [totalEmails, statusStats, topTemplates, recentActivity] =
      await Promise.all([
        this.prisma.emailLog.count({ where: whereCondition }),

        // Status별 통계
        this.prisma.emailLog.groupBy({
          by: ['status'],
          where: whereCondition,
          _count: {
            status: true,
          },
        }),

        // 가장 많이 사용된 템플릿
        this.prisma.emailLog.groupBy({
          by: ['templateId'],
          where: {
            ...whereCondition,
            templateId: { not: null },
          },
          _count: {
            templateId: true,
          },
          orderBy: {
            _count: {
              templateId: 'desc',
            },
          },
          take: 5,
        }),

        // 최근 활동 (일별 이메일 발송량) - 간단한 방식으로 변경
        this.prisma.emailLog.findMany({
          where: whereCondition,
          select: {
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
      ]);

    // 템플릿 정보 가져오기
    const templateIds = topTemplates
      .map((t) => t.templateId)
      .filter(Boolean) as string[];

    const templates =
      templateIds.length > 0
        ? await this.prisma.emailTemplate.findMany({
            where: { id: { in: templateIds } },
            select: { id: true, name: true },
          })
        : [];

    const topTemplatesWithNames = topTemplates.map((stat) => {
      const template = templates.find((t) => t.id === stat.templateId);
      return {
        templateId: stat.templateId,
        templateName: template?.name || 'Unknown',
        count: stat._count.templateId,
      };
    });

    return {
      totalEmails,
      statusStats: statusStats.map((stat) => ({
        status: stat.status,
        count: stat._count.status,
      })),
      topTemplates: topTemplatesWithNames,
      recentActivity,
    };
  }
}
