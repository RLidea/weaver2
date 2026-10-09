import { PrismaClient } from '@weaver2/prisma';

export async function FindAllBoardsQuery(prisma: PrismaClient) {
  return prisma.board.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  });
}
