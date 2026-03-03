import { PrismaClient } from '@prisma/client';
import { COMMENT_CHILDREN_INCLUDE } from './find-all-comments-by-post-id.query';

export async function FindCommentByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.comment.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, displayName: true } },
      ...COMMENT_CHILDREN_INCLUDE,
    },
  });
}
