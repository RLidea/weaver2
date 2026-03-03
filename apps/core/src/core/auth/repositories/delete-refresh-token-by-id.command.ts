import { PrismaClient } from '@prisma/client';

export async function DeleteRefreshTokenByIdCommand(
  prisma: PrismaClient,
  id: string,
  userId: string,
) {
  return prisma.refreshToken.deleteMany({
    where: { id, userId },
  });
}
