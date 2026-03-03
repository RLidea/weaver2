import { PrismaClient } from '@prisma/client';

export async function FindUserByIdQuery(prisma: PrismaClient, id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { userSetting: true }, // Include userSetting
  });
}
