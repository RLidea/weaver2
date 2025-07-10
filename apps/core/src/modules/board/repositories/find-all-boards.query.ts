import { PrismaClient } from '@prisma/client';

export async function FindAllBoardsQuery(prisma: PrismaClient) {
  return prisma.board.findMany({
    orderBy: { name: 'asc' },
  });
}
