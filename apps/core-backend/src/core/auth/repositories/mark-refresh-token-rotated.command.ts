import { PrismaClient } from '@prisma/client';
import { hashToken } from '../utils/auth-crypto.util';

/**
 * 회전(재발급)된 토큰을 삭제하지 않고 rotatedAt으로 마킹한다.
 * 마킹된 토큰이 다시 제시되면 재사용(탈취) 감지에 쓰이므로 만료 시점까지 보존한다.
 */
export async function MarkRefreshTokenRotatedCommand(
  prisma: PrismaClient,
  token: string,
  rotatedAt: Date,
) {
  return prisma.refreshToken.updateMany({
    where: { token: hashToken(token) },
    data: { rotatedAt },
  });
}
