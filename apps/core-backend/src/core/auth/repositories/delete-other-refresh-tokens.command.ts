import { PrismaClient } from '@prisma/client';

export async function DeleteOtherRefreshTokensCommand(
  prisma: PrismaClient,
  userId: string,
  currentToken: string,
) {
  return prisma.refreshToken.deleteMany({
    where: {
      userId,
      token: { not: currentToken },
    },
  });
}
