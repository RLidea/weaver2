import { Prisma, PrismaClient } from '@weaver2/prisma';

export async function DeleteRefreshTokensByUserIdCommand(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
) {
  return prisma.refreshToken.deleteMany({
    where: { userId },
  });
}
