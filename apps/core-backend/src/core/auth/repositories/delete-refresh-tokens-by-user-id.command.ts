import { PrismaClient } from '@weaver2/prisma';

export async function DeleteRefreshTokensByUserIdCommand(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.refreshToken.deleteMany({
    where: { userId },
  });
}
