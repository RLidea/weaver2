import { Prisma, PrismaClient } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Soft-delete a post and cascade to its child comments.
 * 첨부는 그대로 둔다 — 지운 글은 PostReadPolicy 가 아무에게도 읽히지 않게 하므로 첨부도 못 받는다.
 * 보존 기간 뒤 글이 물리 삭제되면 첨부 관계가 함께 사라지고, 파일은 고아가 되어 정리된다.
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

  return prisma.post.update({
    where: { id },
    data: { deletedAt },
  });
}
