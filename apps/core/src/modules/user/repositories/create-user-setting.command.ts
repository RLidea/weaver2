import { PrismaClient } from '@prisma/client';

export async function CreateUserSettingCommand(
  prisma: PrismaClient,
  userId: string,
  data: any,
) {
  return prisma.userSetting.create({
    data: {
      userId,
      ...data,
    },
  });
}
