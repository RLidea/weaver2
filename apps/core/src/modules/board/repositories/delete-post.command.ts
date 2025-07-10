import { PrismaClient } from '@prisma/client';

export async function DeletePostCommand(prisma: PrismaClient, id: string) {
  return prisma.post.delete({
    where: { id },
  });
}
