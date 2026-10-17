import { AuthFactor, Prisma, PrismaClient } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/** 잠겼을 때 각 경로가 돌려주는 문구 — 같은 말로 답해야 경로마다 다른 단서가 새지 않는다. */
export const ACCOUNT_LOCKED_MESSAGE =
  'Account is temporarily locked. Please try again later.';

/**
 * 비밀번호·2FA 코드를 확인하기 **전에** 그 요소의 시도 한 번을 원자적으로 잡는다.
 * 잡지 못하면(잠김) false — 호출자는 확인하지도 않고 거절한다. 맞으면 호출자가
 * ResetAuthAttemptsCommand 로 그 요소만 되돌린다.
 *
 * 요소(PASSWORD · SECOND_FACTOR)를 따로 센다. 비밀번호를 가진 공격자가 「다시 로그인 →
 * 2FA 코드」를 되풀이해도 2FA 쪽 카운터는 비밀번호 성공으로 비지 않는다. 재설정도 PASSWORD
 * 만 비워, 메일함을 가진 공격자가 「TOTP 5번 → 재설정 → 5번 더」를 반복하지 못한다.
 *
 * 「확인 → 틀리면 +1」로 세면 읽고-쓰기 사이에 동시 요청이 같은 값을 읽어 카운터가
 * 한 번만 오르고, 잠금 확인도 낡은 값을 본다. 그래서 「아직 한도 밑일 때만 +1」을
 * 조건부 UPDATE 한 번으로 해, 동시에 몇 개가 오든 한도만큼만 통과시킨다.
 */
export async function ReserveAuthAttemptCommand(
  prisma: Db,
  userId: string,
  factor: AuthFactor,
): Promise<boolean> {
  const now = new Date();

  // 첫 시도면 행부터 — 이미 있으면 그대로 둔다
  await prisma.authLockout.createMany({
    data: [{ userId, factor }],
    skipDuplicates: true,
  });

  // 잠금이 풀린 계정은 카운터도 비운다 — 안 비우면 풀리자마자 한 번 틀려 다시 잠긴다
  await prisma.authLockout.updateMany({
    where: { userId, factor, lockedUntil: { lte: now } },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  // 「한도 밑일 때만 +1」과 「이번 시도로 한도에 닿으면 잠금」을 한 문장으로 — 둘로 나누면
  // 사이에서 프로세스가 죽었을 때 failedAttempts = 5 · lockedUntil = null 로 남아, 풀릴 일
  // 없이 계속 막힌다. 이 요청 자체는 이미 잡은 시도라 잠기더라도 확인은 계속한다.
  // 시각은 앱이 넘긴다(컬럼은 UTC 벽시계 값, DB 세션 시간대와 무관하게).
  const lockUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
  const reserved = await prisma.$executeRaw`
    UPDATE auth_lockouts
       SET "failedAttempts" = "failedAttempts" + 1,
           "lockedUntil" = CASE WHEN "failedAttempts" + 1 >= ${MAX_FAILED_ATTEMPTS}
                                THEN ${lockUntil}::timestamp(3) ELSE NULL END
     WHERE "userId" = ${userId}
       AND factor = ${factor}::"AuthFactor"
       AND "failedAttempts" < ${MAX_FAILED_ATTEMPTS}
       AND "lockedUntil" IS NULL`;
  return reserved > 0;
}
