import { PrismaClient } from '@prisma/client';

export async function FindAllPostsByBoardIdQuery(
  prisma: PrismaClient,
  boardId: string,
) {
  return prisma.post.findMany({
    where: { boardId, deletedAt: null },
    include: {
      author: { select: { id: true, username: true, displayName: true } },
      board: {
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
