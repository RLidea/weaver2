import { Prisma, PrismaClient } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export async function FindBoardByNameQuery(prisma: Db, name: string) {
  return prisma.board.findFirst({
    where: { name, deletedAt: null },
  });
}
