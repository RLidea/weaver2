import { Prisma, PrismaClient } from '@weaver2/prisma';
import { hashToken } from '../utils/auth-crypto.util';

/**
 * 회전(재발급)된 토큰을 삭제하지 않고 rotatedAt으로 마킹한다.
 * 마킹된 토큰이 다시 제시되면 재사용(탈취) 감지에 쓰이므로 만료 시점까지 보존한다.
 * 아직 회전하지 않은 행만 마킹한다 — count 가 1 이 아니면 그 사이 다른 요청이 회전했거나 행이 지워졌다
 * (동시 refresh 두 개가 둘 다 새 행을 만들지 못하게).
 */
export async function MarkRefreshTokenRotatedCommand(
  prisma: PrismaClient | Prisma.TransactionClient,
  token: string,
  rotatedAt: Date,
) {
  return prisma.refreshToken.updateMany({
    where: { token: hashToken(token), rotatedAt: null },
    data: { rotatedAt },
  });
}
