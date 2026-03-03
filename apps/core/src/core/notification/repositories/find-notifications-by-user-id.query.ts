import { PrismaClient } from '@prisma/client';

export async function FindNotificationsByUserIdQuery(
  prisma: PrismaClient,
  userId: string,
  cursor?: string,
  limit = 20,
) {
  const take = limit + 1;
  const where = { userId };

  const rows = await prisma.notification.findMany({
    where,
    take,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

  const hasNextPage = rows.length > limit;
  if (hasNextPage) rows.pop();

  return {
    data: rows,
    nextCursor: hasNextPage ? rows[rows.length - 1]?.id : undefined,
    hasNextPage,
  };
}
