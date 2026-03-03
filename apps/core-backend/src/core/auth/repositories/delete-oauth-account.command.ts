import { PrismaClient } from '@prisma/client';

export async function DeleteOAuthAccountCommand(
  prisma: PrismaClient,
  userId: string,
  provider: string,
) {
  return prisma.oAuthAccount.deleteMany({
    where: { userId, provider },
  });
}
