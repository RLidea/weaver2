import { PrismaClient } from '@weaver2/prisma';

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
