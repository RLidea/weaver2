import { Prisma, PrismaClient } from '@prisma/client';

export async function DeleteAuthCommand(
  prisma: PrismaClient | Prisma.TransactionClient,
  authId: string,
) {
  return prisma.auth.delete({
    where: { id: authId },
  });
}
