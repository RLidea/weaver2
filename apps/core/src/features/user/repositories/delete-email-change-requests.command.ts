import { PrismaClient } from '@prisma/client';

export async function DeleteEmailChangeRequestsCommand(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.emailChangeRequest.deleteMany({ where: { userId } });
}
