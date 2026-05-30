import {
  Prisma,
  PrismaClient,
  AbuseReportStatus,
  AbuseReportAction,
  AbuseReportTarget,
} from '@prisma/client';

type AbuseReportDb = PrismaClient | Prisma.TransactionClient;

export async function UpdateAbuseReportStatusCommand(
  prisma: AbuseReportDb,
  id: string,
  data: {
    status: AbuseReportStatus;
    resolvedById?: string;
    resolvedAt?: Date;
    actionTaken?: AbuseReportAction;
    moderatorNote?: string;
  },
) {
  return prisma.abuseReport.update({ where: { id }, data });
}

export async function ResolveRelatedAbuseReportsCommand(
  prisma: AbuseReportDb,
  targetType: AbuseReportTarget,
  targetId: string,
  resolvedById: string,
  actionTaken: AbuseReportAction,
) {
  return prisma.abuseReport.updateMany({
    where: {
      targetType,
      targetId,
      status: { in: ['PENDING', 'REVIEWING'] },
    },
    data: {
      status: 'RESOLVED',
      resolvedById,
      resolvedAt: new Date(),
      actionTaken,
    },
  });
}
