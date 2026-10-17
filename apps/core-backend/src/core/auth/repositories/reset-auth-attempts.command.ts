import { AuthFactor, Prisma, PrismaClient } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

/** 그 요소의 실패 횟수·잠금을 비운다(행이 없으면 실패가 없는 것과 같다). */
export async function ResetAuthAttemptsCommand(
  prisma: Db,
  userId: string,
  factor: AuthFactor,
): Promise<void> {
  await prisma.authLockout.deleteMany({ where: { userId, factor } });
}
