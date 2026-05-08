import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

const POST_INCLUDE = {
  board: true,
  author: { select: { id: true, username: true, displayName: true } },
} satisfies Prisma.PostInclude;

export async function CreatePostCommand(
  prisma: Db,
  data: Prisma.PostCreateInput,
) {
  return prisma.post.create({
    data,
    include: POST_INCLUDE,
  });
}
