import { Prisma, PrismaClient } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export const POST_REVISION_ACTOR_SELECT = {
  select: { id: true, username: true, displayName: true },
} satisfies Prisma.UserDefaultArgs;

/** 한 번에 돌려주는 판의 최대 개수 — 넘치면 최신 것부터 이만큼만 */
export const POST_REVISIONS_LIMIT = 200;

/** 이 글의 판 목록 (최신 순). 본문은 싣지 않는다 — 전문은 판 하나씩 받는다 */
export async function FindPostRevisionsQuery(prisma: Db, postId: string) {
  return prisma.postRevision.findMany({
    where: { postId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: POST_REVISIONS_LIMIT,
    select: {
      id: true,
      postId: true,
      title: true,
      actorUserId: true,
      actorKind: true,
      createdAt: true,
      actorUser: POST_REVISION_ACTOR_SELECT,
    },
  });
}
