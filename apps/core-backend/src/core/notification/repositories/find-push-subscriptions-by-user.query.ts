import { PrismaClient } from '@weaver2/prisma';

export async function FindPushSubscriptionsByUserQuery(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.pushSubscription.findMany({ where: { userId } });
}
