import { OneTimeCodePurpose, Prisma, PrismaClient } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * 살아 있는 링크의 주인을 소비하지 않고 본다. 가입 인증처럼 다른 확인(비밀번호)이 먼저인
 * 경로가 쓴다 — 그 확인이 틀려도 링크는 남는다. 소비는 ConsumeOneTimeLinkCommand 로.
 */
export async function FindOneTimeLinkQuery(
  prisma: Db,
  secretHash: string,
  purpose: OneTimeCodePurpose,
  now: Date,
): Promise<string | null> {
  const row = await prisma.oneTimeCode.findFirst({
    where: { secretHash, purpose, expiresAt: { gt: now } },
    select: { userId: true },
  });
  return row?.userId ?? null;
}
