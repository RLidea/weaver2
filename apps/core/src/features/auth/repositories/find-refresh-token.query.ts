import { PrismaClient } from '@prisma/client';

export async function FindRefreshTokenQuery(
  prisma: PrismaClient,
  token: string,
) {
  return prisma.refreshToken.findUnique({
    where: { token: token },
    include: { auth: true },
  });
}
