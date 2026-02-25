import { PrismaClient } from '@prisma/client';

export async function FindUserByEmailQuery(
  prisma: PrismaClient,
  email: string,
) {
  return prisma.user.findUnique({
    where: { email },
    include: { userSetting: true, localCredential: true },
  });
}
