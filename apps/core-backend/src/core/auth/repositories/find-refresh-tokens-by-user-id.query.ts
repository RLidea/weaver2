import { PrismaClient } from '@prisma/client';

export async function FindRefreshTokensByUserIdQuery(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.refreshToken.findMany({
    where: {
      userId,
      expires: { gt: new Date() },
    },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expires: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
