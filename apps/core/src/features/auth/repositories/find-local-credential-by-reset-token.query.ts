import { PrismaClient } from '@prisma/client';

export async function FindLocalCredentialByResetTokenQuery(
  prisma: PrismaClient,
  token: string,
) {
  return prisma.localCredential.findFirst({
    where: {
      passwordResetToken: token,
      resetTokenExpiry: {
        gte: new Date(),
      },
    },
  });
}
