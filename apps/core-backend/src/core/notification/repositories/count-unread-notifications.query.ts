import { PrismaClient } from '@weaver2/prisma';

export async function CountUnreadNotificationsQuery(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}
