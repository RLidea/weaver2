import { PrismaClient } from '@prisma/client';
import { hashToken } from '../utils/auth-crypto.util';

/**
 * 현재 세션을 제외한 유저의 모든 refresh 토큰을 삭제한다.
 * currentToken은 원문으로 받아 해시해 비교한다(DB는 해시 저장이므로 평문 비교 시 현재 세션까지 삭제되는 버그 방지).
 */
export async function DeleteOtherRefreshTokensCommand(
  prisma: PrismaClient,
  userId: string,
  currentToken: string,
) {
  return prisma.refreshToken.deleteMany({
    where: {
      userId,
      token: { not: hashToken(currentToken) },
    },
  });
}
