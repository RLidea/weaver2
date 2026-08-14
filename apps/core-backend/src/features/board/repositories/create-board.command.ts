import { PrismaClient, Prisma } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export async function CreateBoardCommand(
  prisma: Db,
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
