import { PrismaClient } from '@weaver2/prisma';

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
