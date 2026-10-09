import { PrismaClient } from '@weaver2/prisma';

export async function DeleteRefreshTokenByIdCommand(
  prisma: PrismaClient,
  id: string,
  userId: string,
) {
  return prisma.refreshToken.deleteMany({
    where: { id, userId },
  });
}
