import { PrismaClient } from '@prisma/client';

export async function DeleteOAuthConnectionCommand(
  prisma: PrismaClient,
  authId: string,
  provider: string,
) {
  return prisma.oAuthConnection.deleteMany({
    where: { authId, provider },
  });
}
