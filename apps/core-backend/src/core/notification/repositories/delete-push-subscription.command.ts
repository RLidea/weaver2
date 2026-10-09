import { PrismaClient } from '@weaver2/prisma';

export async function DeletePushSubscriptionCommand(
  prisma: PrismaClient,
  endpoint: string,
  userId: string,
) {
  return prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
}
