import { PrismaClient } from '@weaver2/prisma';

export async function DeleteEmailChangeRequestsCommand(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.emailChangeRequest.deleteMany({ where: { userId } });
}
