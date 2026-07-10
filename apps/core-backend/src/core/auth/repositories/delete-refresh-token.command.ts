import { PrismaClient } from '@prisma/client';
import { hashToken } from '../utils/auth-crypto.util';

/** 원문 토큰을 해시해 해당 행을 삭제한다(로그아웃 등 실제 폐기). */
export async function DeleteRefreshTokenCommand(
  prisma: PrismaClient,
  token: string,
) {
  return prisma.refreshToken.deleteMany({
    where: { token: hashToken(token) },
  });
}
