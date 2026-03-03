import { PrismaClient } from '@prisma/client';

export async function FindLocalCredentialByUserIdQuery(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.localCredential.findUnique({
    where: { userId },
  });
}
