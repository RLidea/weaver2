import {
  PrismaClient,
  AbuseReportTarget,
  AbuseReportReason,
} from '@prisma/client';

export async function CreateAbuseReportCommand(
  prisma: PrismaClient,
  data: {
    reporterId: string;
    targetType: AbuseReportTarget;
    targetId: string;
    reason: AbuseReportReason;
    description?: string;
  },
) {
  return prisma.abuseReport.create({ data });
}
