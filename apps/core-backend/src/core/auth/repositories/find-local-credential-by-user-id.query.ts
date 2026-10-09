import { PrismaClient } from '@weaver2/prisma';

export async function FindLocalCredentialByUserIdQuery(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.localCredential.findUnique({
    where: { userId },
  });
}
