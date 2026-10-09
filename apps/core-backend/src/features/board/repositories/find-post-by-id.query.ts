import { Prisma, PrismaClient } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

const POST_INCLUDE = {
  board: true,
  author: { select: { id: true, username: true, displayName: true } },
} satisfies Prisma.PostInclude;

export async function FindPostByIdQuery(
  prisma: Db,
  where: Prisma.PostWhereUniqueInput,
) {
  return prisma.post.findUnique({
    where,
    include: POST_INCLUDE,
  });
}
