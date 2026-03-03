import { PrismaClient } from '@prisma/client';

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
