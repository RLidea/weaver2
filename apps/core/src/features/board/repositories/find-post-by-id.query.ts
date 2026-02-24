import { PrismaClient } from '@prisma/client';

export async function FindPostByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.post.findUnique({
    where: { id, deletedAt: null },
    include: {
      board: true,
      author: { select: { id: true, username: true, displayName: true } },
    },
  });
}
