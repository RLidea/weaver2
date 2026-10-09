import { PrismaClient } from '@weaver2/prisma';

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
