import { PrismaClient } from '@prisma/client';

export async function DeleteBoardCommand(prisma: PrismaClient, id: string) {
  return prisma.board.delete({
    where: { id },
  });
}
