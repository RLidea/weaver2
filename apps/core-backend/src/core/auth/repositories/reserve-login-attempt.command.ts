import { PrismaClient } from '@weaver2/prisma';

export const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/**
 * 비밀번호·2FA 코드를 확인하기 **전에** 시도 한 번을 원자적으로 잡는다.
 * 잡지 못하면(잠김) false — 호출자는 코드를 보지도 않고 거절한다.
 *
 * 「확인 → 틀리면 +1」로 세면 읽고-쓰기 사이에 동시 요청이 같은 값을 읽어 카운터가
 * 한 번만 오르고, 잠금 확인도 낡은 값을 본다. IP 를 바꿔 가며 한꺼번에 쏘면 수백 번이
 * 잠금 전에 통과한다. 그래서 「아직 한도 밑일 때만 +1」을 조건부 UPDATE 한 번으로 해,
 * 동시에 몇 개가 오든 한도만큼만 통과시킨다. 성공하면 호출자가
 * ResetFailedAttemptsCommand 로 되돌린다.
 */
export async function ReserveLoginAttemptCommand(
  prisma: PrismaClient,
  userId: string,
): Promise<boolean> {
  const now = new Date();

  // 잠금이 풀린 계정은 카운터도 비운다 — 안 비우면 풀리자마자 한 번 틀려 다시 잠긴다
  await prisma.localCredential.updateMany({
    where: { userId, lockedUntil: { lte: now } },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  const reserved = await prisma.localCredential.updateMany({
    where: {
      userId,
      failedAttempts: { lt: MAX_FAILED_ATTEMPTS },
      lockedUntil: null,
    },
    data: { failedAttempts: { increment: 1 } },
  });
  if (reserved.count === 0) return false;

  // 이번 시도로 한도에 닿았으면 잠근다 — 이 요청 자체는 이미 잡은 시도라 확인은 계속한다
  await prisma.localCredential.updateMany({
    where: {
      userId,
      failedAttempts: { gte: MAX_FAILED_ATTEMPTS },
      lockedUntil: null,
    },
    data: { lockedUntil: new Date(now.getTime() + LOCKOUT_DURATION_MS) },
  });
  return true;
}
