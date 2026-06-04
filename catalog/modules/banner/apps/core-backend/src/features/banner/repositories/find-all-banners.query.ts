import { PrismaClient } from '@prisma/client';

export async function FindAllBannersQuery(prisma: PrismaClient) {
  return prisma.banner.findMany({
    where: { deletedAt: null },
    orderBy: [{ slot: 'asc' }, { sortOrder: 'asc' }],
  });
}
