import { PrismaClient } from '@prisma/client';

export async function CreatePostCommand(
  prisma: PrismaClient,
  boardId: string,
  authorId: string,
  title: string,
  content: string,
) {
  return prisma.post.create({
    data: {
      board: { connect: { id: boardId } },
      author: { connect: { id: authorId } },
      title,
      content,
    },
  });
}
