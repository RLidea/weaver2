import { PrismaClient } from '@weaver2/prisma';

export async function FindUserByEmailQuery(
  prisma: PrismaClient,
  email: string,
) {
  return prisma.user.findFirst({
    where: { email, deletedAt: null },
    include: { userSetting: true, localCredential: true },
  });
}
