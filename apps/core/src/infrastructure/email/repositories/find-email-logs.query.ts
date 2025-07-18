import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { EmailStatus } from '@prisma/client';

export interface FindEmailLogsOptions {
  userId?: string;
  status?: EmailStatus;
  templateId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class FindEmailLogsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(options: FindEmailLogsOptions = {}) {
    const {
      userId,
      status,
      templateId,
      from,
      to,
      page = 1,
      limit = 10,
    } = options;

    const where: any = {};

    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (templateId) where.templateId = templateId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const skip = (page - 1) * limit;

    const [emailLogs, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      data: emailLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
