import { PrismaClient } from '@weaver2/prisma';

export async function DeleteTwoFactorChallengesCommand(
  prisma: PrismaClient,
  userId: string,
  method?: string,
) {
  return prisma.twoFactorChallenge.deleteMany({
    where: { userId, ...(method ? { method } : {}) },
  });
}
