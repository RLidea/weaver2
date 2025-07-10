import { PrismaClient } from '@prisma/client';

export async function UpsertUserSettingCommand(
  prisma: PrismaClient,
  userId: string,
  data: any,
) {
  return prisma.userSetting.upsert({
    where: { userId },
    update: { ...data },
    create: {
      userId,
      ...data,
    },
  });
}
