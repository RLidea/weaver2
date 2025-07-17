import { PrismaClient } from '@prisma/client';

export async function FindCommentByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.comment.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, displayName: true } },
    },
  });
}
