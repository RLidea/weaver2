import { PrismaClient } from '@prisma/client';

export async function FindAuthByUserIdQuery(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.auth.findFirst({
    where: {
      userId: userId,
      password: { not: null },
    },
  });
}
