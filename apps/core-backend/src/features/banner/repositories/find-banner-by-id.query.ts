import { PrismaClient } from '@prisma/client';

export async function FindBannerByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.banner.findUnique({ where: { id, deletedAt: null } });
}
