import { PrismaClient } from '@prisma/client';

export async function CreateCommentCommand(
  prisma: PrismaClient,
  postId: string,
  authorId: string,
  content: string,
) {
  return prisma.comment.create({
    data: {
      post: { connect: { id: postId } },
      author: { connect: { id: authorId } },
      content,
    },
  });
}
