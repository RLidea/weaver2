import { PrismaClient } from '@weaver2/prisma';

export async function FindTermsByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.termsAndConditions.findUnique({ where: { id } });
}
