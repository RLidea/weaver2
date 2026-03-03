import { PrismaClient } from '@prisma/client';

export async function UnsuspendUserCommand(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.user.update({
    where: { id: userId },
    // new Date(0) = 정지 해제 마커 (ModerationService 패턴 동일)
    data: { suspendedUntil: new Date(0) },
  });
}
