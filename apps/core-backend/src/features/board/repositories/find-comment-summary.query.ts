import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * 검증·알림용 최소 필드 조회.
 */
export async function FindCommentSummaryQuery(prisma: Db, id: string) {
  return prisma.comment.findUnique({
    where: { id },
    select: { postId: true, deletedAt: true, authorId: true },
  });
}
