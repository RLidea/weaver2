import { Prisma, PrismaClient } from '@prisma/client';

export async function SoftDeleteUserCommand(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
    },
  });
}
