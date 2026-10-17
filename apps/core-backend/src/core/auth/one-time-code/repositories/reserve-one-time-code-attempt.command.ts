import { OneTimeCodePurpose, Prisma, PrismaClient } from '@weaver2/prisma';
import { MAX_CODE_ATTEMPTS } from '../one-time-code.constants';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * 6자리 코드를 확인하기 **전에** 그 코드의 시도 한 번을 잡는다. 잡은 행의 id, 못 잡으면 null.
 *
 * 「확인 → 틀리면 +1」은 읽고-쓰기 사이에 동시 요청이 같은 값을 읽어 한도를 넘긴다
 * (로그인 잠금 c23e25b 와 같은 이유). 「한도 밑일 때만 +1」을 조건부 UPDATE 한 번으로 해,
 * 동시에 몇 개가 오든 한도만큼만 지나간다.
 */
export async function ReserveOneTimeCodeAttemptCommand(
  prisma: Db,
  userId: string,
  purpose: OneTimeCodePurpose,
  now: Date,
): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE one_time_codes SET attempts = attempts + 1
     WHERE "userId" = ${userId}
       AND purpose = ${purpose}::"OneTimeCodePurpose"
       AND attempts < ${MAX_CODE_ATTEMPTS}
       AND "expiresAt" > ${now}::timestamp(3)
    RETURNING id`;
  return rows[0]?.id ?? null;
}
