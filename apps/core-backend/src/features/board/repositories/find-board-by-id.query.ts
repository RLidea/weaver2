import { PrismaClient } from '@weaver2/prisma';

export async function FindBoardByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.board.findUnique({
    where: { id, deletedAt: null },
  });
}
