import { PrismaClient } from '@prisma/client';

export async function SoftDeleteBannerCommand(prisma: PrismaClient, id: string) {
  return prisma.banner.update({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}
