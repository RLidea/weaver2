import { PrismaClient } from '@prisma/client';

export async function FindNotificationsByUserIdQuery(
  prisma: PrismaClient,
  userId: string,
  cursor?: string,
  limit = 20,
) {
  const take = limit + 1;
  const where = { userId };

  const items = await prisma.notification.findMany({
    where,
    take,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

  const hasNextPage = items.length > limit;
  if (hasNextPage) items.pop();

  return {
    items,
    nextCursor: hasNextPage ? items[items.length - 1]?.id : undefined,
    hasNextPage,
  };
}
