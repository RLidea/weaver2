import { PrismaClient } from '@prisma/client';

export async function DeleteBoardCommand(prisma: PrismaClient, id: string) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // ① 소속 게시글 전체 soft delete
    await tx.post.updateMany({
      where: { boardId: id, deletedAt: null },
      data: { deletedAt: now },
    });

    // ② 카테고리 hard delete
    await tx.postCategory.deleteMany({ where: { boardId: id } });

    // ③ ResourcePermission hard delete (resourceType='board', resourceId=boardId)
    await tx.resourcePermission.deleteMany({
      where: { resourceType: 'board', resourceId: id },
    });

    // ④ Board soft delete
    return tx.board.update({
      where: { id },
      data: { deletedAt: now },
    });
  });
}
