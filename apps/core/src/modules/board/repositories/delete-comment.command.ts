import { PrismaClient } from '@prisma/client';

export async function DeleteCommentCommand(prisma: PrismaClient, id: string) {
  return prisma.comment.delete({
    where: { id },
  });
}
