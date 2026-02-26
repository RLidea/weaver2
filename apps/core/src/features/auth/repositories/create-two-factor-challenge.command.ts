import { PrismaClient } from '@prisma/client';

export async function CreateTwoFactorChallengeCommand(
  prisma: PrismaClient,
  userId: string,
  codeHash: string,
  method: string,
  expiresAt: Date,
) {
  await prisma.twoFactorChallenge.deleteMany({ where: { userId, method } });
  return prisma.twoFactorChallenge.create({
    data: { userId, codeHash, method, expiresAt },
  });
}
