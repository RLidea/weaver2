import { PrismaClient } from '@prisma/client';

export async function DeleteTwoFactorChallengesCommand(
  prisma: PrismaClient,
  userId: string,
  method?: string,
) {
  return prisma.twoFactorChallenge.deleteMany({
    where: { userId, ...(method ? { method } : {}) },
  });
}
