import { PrismaClient } from '@prisma/client';

export async function UpdateTermsCommand(
  prisma: PrismaClient,
  id: string,
  data: { title?: string; content?: string; effectiveAt?: Date },
) {
  return prisma.termsAndConditions.update({ where: { id }, data });
}
