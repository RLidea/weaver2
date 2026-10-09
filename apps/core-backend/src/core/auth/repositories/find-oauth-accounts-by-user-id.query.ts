import { PrismaClient } from '@weaver2/prisma';

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
