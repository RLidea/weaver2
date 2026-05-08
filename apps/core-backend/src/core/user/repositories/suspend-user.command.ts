import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * suspendedUntil:
 *  - Date     : 미래 시각까지 정지
 *  - null     : 영구 정지 (해제 시점 없음)
 */
export async function SuspendUserCommand(
  prisma: Db,
  userId: string,
  suspendedUntil: Date | null,
) {
  return prisma.user.update({
    where: { id: userId },
    data: { suspendedUntil },
    select: { id: true, suspendedUntil: true },
  });
}
