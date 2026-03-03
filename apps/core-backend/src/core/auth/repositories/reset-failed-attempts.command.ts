import { PrismaClient } from '@prisma/client';

export async function ResetFailedAttemptsCommand(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.localCredential.update({
    where: { userId },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
    },
  });
}
