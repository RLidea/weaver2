import { PrismaClient, Prisma } from '@weaver2/prisma';

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
