import { OneTimeCodePurpose, Prisma, PrismaClient } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * 링크를 확인하고 소비한다 — 한 문장이라 같은 링크로 동시에 두 번 와도 하나만 주인을 받는다.
 * 살아 있는 링크가 없으면 null.
 */
export async function ConsumeOneTimeLinkCommand(
  prisma: Db,
  secretHash: string,
  purpose: OneTimeCodePurpose,
  now: Date,
): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ userId: string }[]>`
    DELETE FROM one_time_codes
     WHERE "secretHash" = ${secretHash}
       AND purpose = ${purpose}::"OneTimeCodePurpose"
       AND "expiresAt" > ${now}::timestamp(3)
    RETURNING "userId"`;
  return rows[0]?.userId ?? null;
}
