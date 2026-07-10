import { PrismaClient } from '@prisma/client';

/** 회전된 토큰의 재사용 감지 유예 기간(일). 이보다 오래된 회전 토큰은 정리 대상. */
export const ROTATED_TOKEN_RETENTION_DAYS = 7;

/**
 * 한 유저의 refresh 토큰 중 (a) 만료된 것과 (b) 회전된 지 오래된 것을 정리한다.
 * 회전 직후 토큰은 남겨야 재사용 감지가 성립하므로, 보관 기간이 지난 것만 지운다.
 */
export async function PurgeStaleRefreshTokensCommand(
  prisma: PrismaClient,
  userId: string,
  now: Date,
) {
  const rotatedCutoff = new Date(
    now.getTime() - ROTATED_TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  return prisma.refreshToken.deleteMany({
    where: {
      userId,
      OR: [{ expires: { lt: now } }, { rotatedAt: { lt: rotatedCutoff } }],
    },
  });
}
