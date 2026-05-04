import { PrismaClient } from '@prisma/client';

export async function DeletePushSubscriptionCommand(
  prisma: PrismaClient,
  endpoint: string,
  userId: string,
) {
  return prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
}
