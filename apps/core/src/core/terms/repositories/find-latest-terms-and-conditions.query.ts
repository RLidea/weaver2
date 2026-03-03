import { PrismaClient } from '@prisma/client';

export async function FindLatestTermsAndConditionsQuery(prisma: PrismaClient) {
  const now = new Date();
  return prisma.termsAndConditions.findMany({
    distinct: ['title'],
    orderBy: [{ title: 'asc' }, { version: 'desc' }],
    where: {
      effectiveAt: { lte: now },
    },
  });
}
