import { PrismaClient } from '@prisma/client';

export async function FindAllPostsByBoardIdQuery(
  prisma: PrismaClient,
  boardId: string,
) {
  return prisma.post.findMany({
    where: { boardId },
    include: {
      author: { select: { id: true, username: true, displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
