import { PrismaClient } from '@prisma/client';

export async function SavePushSubscriptionCommand(
  prisma: PrismaClient,
  data: { userId: string; endpoint: string; p256dh: string; auth: string },
) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    update: { userId: data.userId, p256dh: data.p256dh, auth: data.auth },
    create: data,
  });
}
