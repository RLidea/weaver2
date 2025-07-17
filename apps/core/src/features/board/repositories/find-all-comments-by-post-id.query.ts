import { PrismaClient } from '@prisma/client';

export async function FindAllCommentsByPostIdQuery(
  prisma: PrismaClient,
  postId: string,
) {
  return prisma.comment.findMany({
    where: { postId },
    include: {
      author: { select: { id: true, username: true, displayName: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}
