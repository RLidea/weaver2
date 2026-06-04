import { PrismaClient, BannerSlot } from '@prisma/client';

export async function FindActiveBannersBySlotQuery(
  prisma: PrismaClient,
  slot: BannerSlot | undefined,
  now: Date,
) {
  return prisma.banner.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(slot ? { slot } : {}),
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { sortOrder: 'asc' },
  });
}
