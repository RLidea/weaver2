import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export async function WarnUserCommand(prisma: Db, userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { warningCount: { increment: 1 } },
    select: { id: true, warningCount: true },
  });
}
