import { PrismaClient, PostStatus } from '@prisma/client';

export async function UpdatePostCommand(
  prisma: PrismaClient,
  id: string,
  data: {
    title?: string;
    content?: string;
    status?: PostStatus;
    isPinned?: boolean;
    isSecret?: boolean;
    priority?: number;
    categoryId?: string | null;
  },
) {
  return prisma.post.update({
    where: { id },
    data,
    include: {
      board: {
        select: {
          id: true,
          name: true,
          description: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      author: { select: { id: true, username: true, displayName: true } },
    },
  });
}
