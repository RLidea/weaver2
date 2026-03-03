import { PrismaClient } from '@prisma/client';

export async function FindEmailChangeRequestQuery(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.emailChangeRequest.findFirst({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
  });
}
