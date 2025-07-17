import { PrismaClient } from '@prisma/client';

export async function FindAuthByPasswordResetTokenQuery(
  prisma: PrismaClient,
  token: string,
) {
  return prisma.auth.findFirst({
    where: {
      passwordResetToken: token,
      resetTokenExpiry: {
        gte: new Date(),
      },
    },
  });
}
