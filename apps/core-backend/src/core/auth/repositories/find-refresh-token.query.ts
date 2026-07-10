import { PrismaClient } from '@prisma/client';
import { hashToken } from '../utils/auth-crypto.util';

/** 원문 토큰을 해시해 조회한다. rotatedAt·user 포함(회전/탈취 판정용). */
export async function FindRefreshTokenQuery(
  prisma: PrismaClient,
  token: string,
) {
  return prisma.refreshToken.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });
}
