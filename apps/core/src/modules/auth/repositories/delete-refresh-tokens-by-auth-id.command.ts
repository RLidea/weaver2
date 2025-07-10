import { PrismaClient } from '@prisma/client';

export async function DeleteRefreshTokensByAuthIdCommand(
  prisma: PrismaClient,
  authId: string,
) {
  return prisma.refreshToken.deleteMany({
    where: { authId },
  });
}
