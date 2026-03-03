import { PrismaClient } from '@prisma/client';

export async function DeleteRefreshTokenCommand(
  prisma: PrismaClient,
  token: string,
) {
  return prisma.refreshToken.delete({
    where: { token },
  });
}
