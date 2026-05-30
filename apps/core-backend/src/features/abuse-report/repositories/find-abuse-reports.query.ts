import {
  Prisma,
  PrismaClient,
  AbuseReportStatus,
  AbuseReportTarget,
} from '@prisma/client';

export async function FindAbuseReportsQuery(
  prisma: PrismaClient,
  filters: { status?: AbuseReportStatus; targetType?: AbuseReportTarget },
  cursor?: string,
  limit = 20,
) {
  const take = limit + 1;
  const where: Prisma.AbuseReportWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.targetType) where.targetType = filters.targetType;

  const rows = await prisma.abuseReport.findMany({
    where,
    take,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      reporter: { select: { id: true, username: true, displayName: true } },
      resolvedBy: { select: { id: true, username: true, displayName: true } },
    },
  });

  const hasNextPage = rows.length > limit;
  if (hasNextPage) rows.pop();

  return {
    data: rows,
    nextCursor: hasNextPage ? rows[rows.length - 1]?.id : undefined,
    hasNextPage,
  };
}

export async function FindAbuseReportByIdQuery(
  prisma: PrismaClient,
  id: string,
) {
  return prisma.abuseReport.findUnique({
    where: { id },
    include: {
      reporter: { select: { id: true, username: true, displayName: true } },
      resolvedBy: { select: { id: true, username: true, displayName: true } },
    },
  });
}

export async function CountAbuseReportsByTargetQuery(
  prisma: PrismaClient,
  targetType: AbuseReportTarget,
  targetId: string,
) {
  return prisma.abuseReport.count({ where: { targetType, targetId } });
}
