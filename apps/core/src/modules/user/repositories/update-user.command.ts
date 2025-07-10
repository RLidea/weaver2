import { PrismaClient } from '@prisma/client';

export async function UpdateUserCommand(
  prisma: PrismaClient,
  userId: string,
  data: any,
) {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}
