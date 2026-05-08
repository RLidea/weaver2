import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

const POST_INCLUDE = {
  board: true,
  author: { select: { id: true, username: true, displayName: true } },
} satisfies Prisma.PostInclude;

export async function FindPinnedPostsQuery(
  prisma: Db,
  where: Prisma.PostWhereInput,
) {
  return prisma.post.findMany({
    where: { ...where, isPinned: true },
    include: POST_INCLUDE,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
}
