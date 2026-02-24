import { PrismaClient } from '@prisma/client';

export async function DeleteCommentCommand(prisma: PrismaClient, id: string) {
  const hasChildren = await prisma.comment.count({
    where: { parentId: id, deletedAt: null },
  });

  if (hasChildren > 0) {
    // 하위 댓글이 있으면 soft delete
    return prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date(), content: '' },
    });
  }

  // 하위 댓글이 없으면 hard delete
  return prisma.comment.delete({ where: { id } });
}
