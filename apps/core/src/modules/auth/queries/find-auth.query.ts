import { PrismaService } from '@weaver2/prisma';

export async function FindAuthQuery(
  prisma: PrismaService,
  options: { userId: string; email?: string },
) {
  return prisma.auth.findFirst({
    where: options,
  });
}
