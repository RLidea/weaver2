import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * 알림 발송 대상 식별용 최소 필드 조회 (authorId, boardId).
 */
export async function FindPostNotificationTargetQuery(
  prisma: Db,
  postId: string,
) {
  return prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, boardId: true },
  });
}
