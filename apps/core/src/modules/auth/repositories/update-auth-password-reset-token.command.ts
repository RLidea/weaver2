import { PrismaClient } from '@prisma/client';

export async function UpdateAuthPasswordResetTokenCommand(
  prisma: PrismaClient,
  authId: string,
  token: string,
  expiry: Date,
) {
  return prisma.auth.update({
    where: { id: authId },
    data: {
      passwordResetToken: token,
      resetTokenExpiry: expiry,
    },
  });
}
