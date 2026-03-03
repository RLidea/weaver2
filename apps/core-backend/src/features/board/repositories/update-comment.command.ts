import { PrismaClient } from '@prisma/client';

export async function UpdateCommentCommand(
  prisma: PrismaClient,
  id: string,
  data: { content?: string },
) {
  return prisma.comment.update({
    where: { id },
    data,
  });
}
