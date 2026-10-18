import { Prisma, PrismaClient } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

/** 이 글의 가장 최근 판의 제목 · 본문 — 같은 내용을 또 쓰지 않으려고 본다 */
export async function FindLatestPostRevisionQuery(prisma: Db, postId: string) {
  return prisma.postRevision.findFirst({
    where: { postId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { title: true, content: true },
  });
}
