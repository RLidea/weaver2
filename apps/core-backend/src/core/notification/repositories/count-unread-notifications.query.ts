import { PrismaClient } from '@prisma/client';

export async function CountUnreadNotificationsQuery(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}
