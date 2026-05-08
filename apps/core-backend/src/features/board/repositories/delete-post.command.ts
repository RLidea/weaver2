import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Soft-delete a post and cascade to its child comments and files.
 *
 * Caller is responsible for wrapping this in a transaction
 * (prisma.$transaction) so all writes succeed or roll back together.
 */
export async function DeletePostCommand(prisma: Db, id: string) {
  const deletedAt = new Date();

  await prisma.comment.updateMany({
    where: { postId: id, deletedAt: null },
    data: { deletedAt },
  });

  await prisma.postFile.updateMany({
    where: { postId: id, deletedAt: null },
    data: { deletedAt },
  });

  return prisma.post.update({
    where: { id },
    data: { deletedAt },
  });
}
