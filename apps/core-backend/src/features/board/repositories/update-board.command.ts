import { PrismaClient } from '@weaver2/prisma';

export async function UpdateBoardCommand(
  prisma: PrismaClient,
  id: string,
  data: { name?: string; description?: string },
) {
  return prisma.board.update({
    where: { id },
    data,
  });
}
