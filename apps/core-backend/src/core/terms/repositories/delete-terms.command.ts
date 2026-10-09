import { PrismaClient } from '@weaver2/prisma';

export async function DeleteTermsCommand(prisma: PrismaClient, id: string) {
  return prisma.termsAndConditions.delete({ where: { id } });
}
