import { PrismaClient } from '@prisma/client';

export async function UpdateUserEmailCommand(
  prisma: PrismaClient,
  userId: string,
  newEmail: string,
) {
  return prisma.user.update({
    where: { id: userId },
    data: { email: newEmail },
  });
}
