import { PrismaClient } from '@weaver2/prisma';

/**
 * 통과한 TOTP 코드의 시간 단위를 남긴다 — 그 단위 이하는 다시 통과하지 못한다(재사용 차단).
 * 더 이른 단위가 남아 있을 때만 쓰므로, 같은 코드로 동시에 두 번 와도 하나만 true.
 */
export async function RecordTotpTimeStepCommand(
  prisma: PrismaClient,
  userId: string,
  timeStep: number,
): Promise<boolean> {
  const { count } = await prisma.twoFactorMethod.updateMany({
    where: {
      userId,
      kind: 'TOTP',
      confirmedAt: { not: null },
      OR: [{ lastUsedTimeStep: null }, { lastUsedTimeStep: { lt: timeStep } }],
    },
    data: { lastUsedTimeStep: timeStep },
  });
  return count === 1;
}
