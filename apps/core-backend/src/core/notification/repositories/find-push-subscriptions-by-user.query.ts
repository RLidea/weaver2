import { PrismaClient } from '@prisma/client';

export async function FindPushSubscriptionsByUserQuery(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.pushSubscription.findMany({ where: { userId } });
}
