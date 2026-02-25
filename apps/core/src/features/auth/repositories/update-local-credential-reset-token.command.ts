import { PrismaClient } from '@prisma/client';

export async function UpdateLocalCredentialResetTokenCommand(
  prisma: PrismaClient,
  userId: string,
  token: string,
  expiry: Date,
) {
  return prisma.localCredential.update({
    where: { userId },
    data: {
      passwordResetToken: token,
      resetTokenExpiry: expiry,
    },
  });
}
