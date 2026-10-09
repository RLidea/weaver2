import { Prisma, PrismaClient } from '@weaver2/prisma';

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
