import { PrismaClient } from '@prisma/client';

export async function DeletePostCommand(prisma: PrismaClient, id: string) {
  return prisma.post.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
