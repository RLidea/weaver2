import { Prisma, PrismaClient } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export async function IncrementPostViewCountCommand(
  prisma: Db,
  postId: string,
) {
  return prisma.post.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
  });
}
