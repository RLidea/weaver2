import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export async function FindBoardByNameQuery(prisma: Db, name: string) {
  return prisma.board.findFirst({
    where: { name, deletedAt: null },
  });
}
