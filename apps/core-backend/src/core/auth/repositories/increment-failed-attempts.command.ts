import { PrismaClient } from '@prisma/client';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function IncrementFailedAttemptsCommand(
  prisma: PrismaClient,
  userId: string,
) {
  const credential = await prisma.localCredential.findUnique({
    where: { userId },
    select: { failedAttempts: true },
  });

  const newCount = (credential?.failedAttempts ?? 0) + 1;
  const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;

  return prisma.localCredential.update({
    where: { userId },
    data: {
      failedAttempts: newCount,
      ...(shouldLock && {
        lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
      }),
    },
  });
}
