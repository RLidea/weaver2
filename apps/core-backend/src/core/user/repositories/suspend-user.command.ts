import { PrismaClient } from '@prisma/client';

export async function SuspendUserCommand(
  prisma: PrismaClient,
  userId: string,
  suspendedUntil: Date,
) {
  return prisma.user.update({
    where: { id: userId },
    data: { suspendedUntil },
  });
}
