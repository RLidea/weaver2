import { PrismaClient } from '@prisma/client';

export async function FindOAuthAccountsByUserIdQuery(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.oAuthAccount.findMany({
    where: { userId },
    select: {
      provider: true,
      providerId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}
