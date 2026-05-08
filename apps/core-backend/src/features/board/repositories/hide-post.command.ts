import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export async function HidePostCommand(prisma: Db, id: string, hiddenAt: Date) {
  return prisma.post.update({ where: { id }, data: { hiddenAt } });
}

export async function UnhidePostCommand(prisma: Db, id: string) {
  return prisma.post.update({ where: { id }, data: { hiddenAt: null } });
}
