import { PrismaClient, ReportStatus, ReportAction } from '@prisma/client';

export async function UpdateReportStatusCommand(
  prisma: PrismaClient,
  id: string,
  data: {
    status: ReportStatus;
    resolvedById?: string;
    resolvedAt?: Date;
    actionTaken?: ReportAction;
    moderatorNote?: string;
  },
) {
  return prisma.report.update({ where: { id }, data });
}

export async function ResolveRelatedReportsCommand(
  prisma: PrismaClient,
  targetType: string,
  targetId: string,
  resolvedById: string,
  actionTaken: ReportAction,
) {
  return prisma.report.updateMany({
    where: {
      targetType: targetType as never,
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
