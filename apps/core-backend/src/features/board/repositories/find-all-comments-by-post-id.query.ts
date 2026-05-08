import { PrismaClient } from '@prisma/client';

const AUTHOR_SELECT = {
  select: { id: true, username: true, displayName: true },
};

// Prisma는 무제한 재귀를 지원하지 않으므로 4단계 depth까지 중첩
export const COMMENT_CHILDREN_INCLUDE = {
  children: {
    where: { deletedAt: null, hiddenAt: null },
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: AUTHOR_SELECT,
      children: {
        where: { deletedAt: null, hiddenAt: null },
        orderBy: { createdAt: 'asc' as const },
        include: {
          author: AUTHOR_SELECT,
          children: {
            where: { deletedAt: null, hiddenAt: null },
            orderBy: { createdAt: 'asc' as const },
            include: {
              author: AUTHOR_SELECT,
              children: {
                where: { deletedAt: null, hiddenAt: null },
                orderBy: { createdAt: 'asc' as const },
                include: {
                  author: AUTHOR_SELECT,
                },
              },
            },
          },
        },
      },
    },
  },
};

export async function FindAllCommentsByPostIdQuery(
  prisma: PrismaClient,
  postId: string,
) {
  return prisma.comment.findMany({
    where: { postId, parentId: null, deletedAt: null, hiddenAt: null },
    include: {
      author: AUTHOR_SELECT,
      ...COMMENT_CHILDREN_INCLUDE,
    },
    orderBy: { createdAt: 'asc' },
  });
}
