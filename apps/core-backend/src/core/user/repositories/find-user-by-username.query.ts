import { PrismaClient } from '@weaver2/prisma';

export async function FindUserByUsernameQuery(
  prisma: PrismaClient,
  username: string,
) {
  return prisma.user.findUnique({
    where: { username },
    include: { userSetting: true }, // Include userSetting
  });
}
