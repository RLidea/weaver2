import { PrismaClient } from '@weaver2/prisma';

export async function UpdateTermsCommand(
  prisma: PrismaClient,
  id: string,
  data: { title?: string; content?: string; effectiveAt?: Date },
) {
  return prisma.termsAndConditions.update({ where: { id }, data });
}
