import { PrismaClient } from '@weaver2/prisma';

export async function FindTwoFactorChallengeQuery(
  prisma: PrismaClient,
  userId: string,
  method: string,
) {
  return prisma.twoFactorChallenge.findFirst({
    where: {
      userId,
      method,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}
