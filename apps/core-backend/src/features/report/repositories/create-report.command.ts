import { PrismaClient, ReportTarget, ReportReason } from '@weaver2/prisma';

export async function CreateReportCommand(
  prisma: PrismaClient,
  data: {
    reporterId: string;
    targetType: ReportTarget;
    targetId: string;
    reason: ReportReason;
    description?: string;
  },
) {
  return prisma.report.create({ data });
}
