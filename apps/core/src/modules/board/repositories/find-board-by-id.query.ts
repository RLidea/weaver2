import { PrismaClient } from '@prisma/client';

export async function FindBoardByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.board.findUnique({
    where: { id },
  });
}
