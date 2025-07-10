import { PrismaClient } from '@prisma/client';

export async function UpdateAuthPasswordByUserIdCommand(
  prisma: PrismaClient,
  userId: string,
  hashedPassword: string,
) {
  return prisma.auth.update({
    where: { userId },
    data: { password: hashedPassword },
  });
}
