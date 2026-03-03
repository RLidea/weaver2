import { PrismaClient } from '@prisma/client';

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
