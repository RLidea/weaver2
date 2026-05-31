import { PrismaClient, Prisma } from '@prisma/client';

export async function CreateBannerCommand(
  prisma: PrismaClient,
  data: Prisma.BannerUncheckedCreateInput,
) {
  return prisma.banner.create({ data });
}
