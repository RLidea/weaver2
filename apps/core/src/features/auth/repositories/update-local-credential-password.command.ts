import { PrismaClient } from '@prisma/client';

export async function UpdateLocalCredentialPasswordCommand(
  prisma: PrismaClient,
  userId: string,
  hashedPassword: string,
) {
  return prisma.localCredential.update({
    where: { userId },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      resetTokenExpiry: null,
    },
  });
}
