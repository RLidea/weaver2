import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export async function HideCommentCommand(
  prisma: Db,
  id: string,
  hiddenAt: Date,
) {
  return prisma.comment.update({ where: { id }, data: { hiddenAt } });
}

export async function UnhideCommentCommand(prisma: Db, id: string) {
  return prisma.comment.update({ where: { id }, data: { hiddenAt: null } });
}

export async function SoftDeleteCommentCommand(
  prisma: Db,
  id: string,
  deletedAt: Date,
) {
  return prisma.comment.update({ where: { id }, data: { deletedAt } });
}
