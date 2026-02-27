import { PrismaClient } from '@prisma/client';

export async function FindTermsByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.termsAndConditions.findUnique({ where: { id } });
}
