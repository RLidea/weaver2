import { Prisma, PrismaClient } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export async function HidePostFileCommand(
  prisma: Db,
  id: string,
  hiddenAt: Date,
) {
  return prisma.postFile.update({ where: { id }, data: { hiddenAt } });
}

export async function UnhidePostFileCommand(prisma: Db, id: string) {
  return prisma.postFile.update({ where: { id }, data: { hiddenAt: null } });
}
