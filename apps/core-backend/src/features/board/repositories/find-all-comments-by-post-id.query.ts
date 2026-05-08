import { PrismaClient } from '@prisma/client';

const AUTHOR_SELECT = {
  select: { id: true, username: true, displayName: true },
};

/**
 * 한 게시글의 가시(visible) 댓글을 평면으로 모두 조회.
 *
 * 깊이 제한 없이 1회 쿼리로 끝나며, 트리 구조 변환은 호출자가
 * `buildCommentTree`로 수행한다.
 */
export async function FindFlatCommentsByPostIdQuery(
  prisma: PrismaClient,
  postId: string,
) {
  return prisma.comment.findMany({
    where: { postId, deletedAt: null, hiddenAt: null },
    include: { author: AUTHOR_SELECT },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * 페이지된 루트 댓글 ID들의 모든 자손(자기 자신 제외) 평면 조회.
 * 다른 루트의 자손도 포함될 수 있으므로 호출자에서 rootIds를 넘겨
 * `buildCommentTree`가 도달 가능한 노드만 트리에 포함시킨다.
 */
export async function FindFlatDescendantsByPostIdQuery(
  prisma: PrismaClient,
  postId: string,
) {
  return prisma.comment.findMany({
    where: {
      postId,
      parentId: { not: null },
      deletedAt: null,
      hiddenAt: null,
    },
    include: { author: AUTHOR_SELECT },
    orderBy: { createdAt: 'asc' },
  });
}
