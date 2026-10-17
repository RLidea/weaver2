import { OneTimeCodePurpose, Prisma, PrismaClient } from '@weaver2/prisma';
import { MAX_CODE_ATTEMPTS } from '../one-time-code.constants';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * 목적마다 하나뿐인 일회용 비밀을 새로 쓴다. 재발급 유예를 DB 가 지킨다.
 * 쓰지 못하면(유예 중이거나, 시도를 다 쓴 코드가 아직 살아 있으면) false.
 *
 * - 재발급은 시도 횟수를 되돌리지 않는다. 되돌리면 「5번 틀리고 → 새로 받고 → 5번 더」가
 *   끝없이 된다. 만료된 행을 덮을 때만 0 으로 시작한다.
 * - 시각은 앱이 넘긴다. 컬럼이 시간대 없는 TIMESTAMP 이고 Prisma 는 UTC 벽시계 값을 쓰는데,
 *   DB 세션 시간대는 서버 설정을 따라 now() 가 몇 시간 어긋날 수 있다.
 */
export async function UpsertOneTimeCodeCommand(
  prisma: Db,
  data: {
    userId: string;
    purpose: OneTimeCodePurpose;
    secretHash: string;
    newEmail: string | null;
    now: Date;
    expiresAt: Date;
    cooldownMs: number;
  },
): Promise<boolean> {
  const reissuableBefore = new Date(data.now.getTime() - data.cooldownMs);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO one_time_codes (id, "userId", purpose, "secretHash", "newEmail", attempts, "expiresAt", "createdAt")
    VALUES (gen_random_uuid()::text, ${data.userId}, ${data.purpose}::"OneTimeCodePurpose",
            ${data.secretHash}, ${data.newEmail}, 0,
            ${data.expiresAt}::timestamp(3), ${data.now}::timestamp(3))
    ON CONFLICT ("userId", purpose) DO UPDATE SET
      "secretHash" = EXCLUDED."secretHash",
      "newEmail"   = EXCLUDED."newEmail",
      "expiresAt"  = EXCLUDED."expiresAt",
      "createdAt"  = EXCLUDED."createdAt",
      attempts = CASE WHEN one_time_codes."expiresAt" <= EXCLUDED."createdAt"
                      THEN 0 ELSE one_time_codes.attempts END
    WHERE one_time_codes."createdAt" <= ${reissuableBefore}::timestamp(3)
      AND (one_time_codes.attempts < ${MAX_CODE_ATTEMPTS}
           OR one_time_codes."expiresAt" <= EXCLUDED."createdAt")
    RETURNING id`;
  return rows.length === 1;
}
