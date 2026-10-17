import { PrismaClient } from '@weaver2/prisma';

/** 만료된 일회용 비밀을 지운다. 지운 개수를 돌려준다. */
export async function PurgeExpiredOneTimeCodesCommand(
  prisma: PrismaClient,
  now: Date,
): Promise<number> {
  const result = await prisma.oneTimeCode.deleteMany({
    where: { expiresAt: { lte: now } },
  });
  return result.count;
}
