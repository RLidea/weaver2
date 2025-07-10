import { PrismaClient } from '@prisma/client';

export async function UpdatePostCommand(
  prisma: PrismaClient,
  id: string,
  data: { title?: string; content?: string },
) {
  return prisma.post.update({
    where: { id },
    data,
  });
}
