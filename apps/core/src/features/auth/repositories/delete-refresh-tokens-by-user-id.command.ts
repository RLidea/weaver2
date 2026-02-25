import { PrismaClient } from '@prisma/client';

export async function DeleteRefreshTokensByUserIdCommand(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.refreshToken.deleteMany({
    where: { userId },
  });
}
