import { PrismaClient, Prisma } from '@prisma/client';

export async function CreateCommentCommand(
  prisma: PrismaClient,
  postId: string,
  authorId: string | null,
  content: string,
  parentId?: string | null,
) {
  const baseData = {
    post: { connect: { id: postId } },
    content,
    ...(parentId && { parent: { connect: { id: parentId } } }),
  };

  const createData = authorId
    ? { ...baseData, author: { connect: { id: authorId } } }
    : baseData;

  return prisma.comment.create({
    data: createData as Prisma.CommentCreateInput,
    include: {
      author: { select: { id: true, username: true, displayName: true } },
    },
  });
}
