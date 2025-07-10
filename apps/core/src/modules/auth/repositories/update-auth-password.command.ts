import { PrismaClient } from '@prisma/client';

export async function UpdateAuthPasswordCommand(
  prisma: PrismaClient,
  authId: string,
  hashedPassword: string,
) {
  return prisma.auth.update({
    where: { id: authId },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      resetTokenExpiry: null,
    },
  });
}
