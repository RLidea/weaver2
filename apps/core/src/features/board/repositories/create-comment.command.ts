import { PrismaClient, Prisma } from '@prisma/client';

export async function CreateCommentCommand(
  prisma: PrismaClient,
  postId: string,
  authorId: string | null,
  content: string,
) {
  const baseData = {
    post: { connect: { id: postId } },
    content,
  };

  const createData = authorId
    ? { ...baseData, author: { connect: { id: authorId } } }
    : baseData;

  return prisma.comment.create({
    data: createData as Prisma.CommentCreateInput,
  });
}
