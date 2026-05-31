import { PrismaClient, Prisma } from '@prisma/client';

export async function UpdateBannerCommand(
  prisma: PrismaClient,
  id: string,
  data: Prisma.BannerUpdateInput,
) {
  return prisma.banner.update({ where: { id, deletedAt: null }, data });
}
