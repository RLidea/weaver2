import { Prisma, PrismaClient } from '@weaver2/prisma';
import { hashToken } from '../utils/auth-crypto.util';

/**
 * 원문 토큰을 받아 SHA-256 해시로 저장한다(원문은 쿠키로만 전달).
 * `oidcSid` 는 SSO 세션의 id_token sid — back-channel 로그아웃이 이 값으로 지운다.
 */
export async function CreateRefreshTokenCommand(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
  token: string,
  expires: Date,
  ipAddress?: string,
  userAgent?: string,
  oidcSid?: string,
) {
  return prisma.refreshToken.create({
    data: {
      token: hashToken(token),
      userId,
      expires,
      ipAddress,
      userAgent,
      oidcSid,
    },
  });
}
