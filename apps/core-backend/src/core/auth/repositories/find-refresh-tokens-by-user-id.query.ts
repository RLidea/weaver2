import { PrismaClient } from '@prisma/client';

export async function FindRefreshTokensByUserIdQuery(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.refreshToken.findMany({
    where: {
      userId,
      expires: { gt: new Date() },
      rotatedAt: null, // 회전(무효화)된 토큰은 세션 목록에서 제외
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
