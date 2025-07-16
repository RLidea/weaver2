import { PrismaClient } from '@prisma/client';

export async function UpsertUserSettingCommand(
  prisma: PrismaClient,
  userId: string,
  data: Record<string, unknown>,
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
