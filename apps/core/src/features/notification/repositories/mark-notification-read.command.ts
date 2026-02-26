import { PrismaClient } from '@prisma/client';

export async function MarkNotificationReadCommand(
  prisma: PrismaClient,
  id: string,
  userId: string,
) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
}

export async function MarkAllNotificationsReadCommand(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
