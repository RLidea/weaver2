import { PrismaClient } from '@prisma/client';

export async function FindOAuthConnectionsByAuthIdQuery(
  prisma: PrismaClient,
  authId: string,
) {
  return prisma.oAuthConnection.findMany({
    where: { authId },
    select: {
      provider: true,
      providerId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}
