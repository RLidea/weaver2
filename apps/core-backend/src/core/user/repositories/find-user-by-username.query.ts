import { PrismaClient } from '@prisma/client';

export async function FindUserByUsernameQuery(
  prisma: PrismaClient,
  username: string,
) {
  return prisma.user.findUnique({
    where: { username },
    include: { userSetting: true }, // Include userSetting
  });
}
