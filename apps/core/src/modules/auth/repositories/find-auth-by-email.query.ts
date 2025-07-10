import { PrismaClient } from '@prisma/client';

export async function FindAuthByEmailQuery(
  prisma: PrismaClient,
  email: string,
) {
  return prisma.auth.findUnique({
    where: { email },
    include: { user: { include: { userSetting: true } } },
  });
}
