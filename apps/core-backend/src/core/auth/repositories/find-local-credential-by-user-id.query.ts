import { Prisma, PrismaClient } from '@weaver2/prisma';

export async function FindLocalCredentialByUserIdQuery(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
) {
  return prisma.localCredential.findUnique({
    where: { userId },
  });
}
