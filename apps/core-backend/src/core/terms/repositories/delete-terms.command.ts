import { PrismaClient } from '@prisma/client';

export async function DeleteTermsCommand(prisma: PrismaClient, id: string) {
  return prisma.termsAndConditions.delete({ where: { id } });
}
