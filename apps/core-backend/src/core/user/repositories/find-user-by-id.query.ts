import { PrismaClient } from '@prisma/client';

export async function FindUserByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: { userSetting: true },
  });
}
