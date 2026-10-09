import { PrismaClient, NotificationType } from '@weaver2/prisma';

export async function CreateNotificationCommand(
  prisma: PrismaClient,
  data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
  },
) {
  return prisma.notification.create({ data });
}
