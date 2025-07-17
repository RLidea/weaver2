import { PrismaClient } from '@prisma/client';

export async function CreateUserSettingCommand(
  prisma: PrismaClient,
  userId: string,
  data: Record<string, unknown>,
) {
  return prisma.userSetting.create({
    data: {
      userId,
      ...data,
    },
  });
}
