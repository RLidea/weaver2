import { PrismaClient } from '@prisma/client';

export async function FindUserByEmailQuery(
  prisma: PrismaClient,
  email: string,
) {
  return prisma.user.findFirst({
    where: { email, deletedAt: null },
    include: { userSetting: true, localCredential: true },
  });
}
