import { PrismaClient } from '@prisma/client';

export async function FindAuthByUserIdAndAuthIdQuery(
  prisma: PrismaClient,
  userId: string,
  authId: string,
) {
  return prisma.auth.findUnique({
    where: { userId, id: authId },
    include: { user: { include: { userSetting: true } } },
  });
}
