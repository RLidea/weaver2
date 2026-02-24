import { PrismaClient } from '@prisma/client';

export async function FindAllBoardsQuery(prisma: PrismaClient) {
  return prisma.board.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  });
}
