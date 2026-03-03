import { PrismaClient } from '@prisma/client';

export async function CreateBoardCommand(
  prisma: PrismaClient,
  name: string,
  description?: string,
) {
  return prisma.board.create({
    data: {
      name,
      description,
    },
  });
}
