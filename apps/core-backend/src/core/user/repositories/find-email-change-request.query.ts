import { PrismaClient } from '@weaver2/prisma';

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
