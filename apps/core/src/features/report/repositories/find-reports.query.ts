import { PrismaClient, ReportStatus, ReportTarget } from '@prisma/client';

export async function FindReportsQuery(
  prisma: PrismaClient,
  filters: { status?: ReportStatus; targetType?: ReportTarget },
  cursor?: string,
  limit = 20,
) {
  const take = limit + 1;
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.targetType) where.targetType = filters.targetType;

  const items = await prisma.report.findMany({
    where,
    take,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      reporter: { select: { id: true, username: true, displayName: true } },
      resolvedBy: { select: { id: true, username: true, displayName: true } },
    },
  });

  const hasNextPage = items.length > limit;
  if (hasNextPage) items.pop();

  return {
    items,
    nextCursor: hasNextPage ? items[items.length - 1]?.id : undefined,
    hasNextPage,
  };
}

export async function FindReportByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.report.findUnique({
    where: { id },
    include: {
      reporter: { select: { id: true, username: true, displayName: true } },
      resolvedBy: { select: { id: true, username: true, displayName: true } },
    },
  });
}

export async function CountReportsByTargetQuery(
  prisma: PrismaClient,
  targetType: ReportTarget,
  targetId: string,
) {
  return prisma.report.count({ where: { targetType, targetId } });
}
