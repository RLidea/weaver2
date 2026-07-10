import { PrismaClient } from '@prisma/client';
import { hashToken } from '../utils/auth-crypto.util';

/** 원문 토큰을 받아 SHA-256 해시로 저장한다(원문은 쿠키로만 전달). */
export async function CreateRefreshTokenCommand(
  prisma: PrismaClient,
  userId: string,
  token: string,
  expires: Date,
  ipAddress?: string,
  userAgent?: string,
) {
  return prisma.refreshToken.create({
    data: {
      token: hashToken(token),
      userId,
      expires,
      ipAddress,
      userAgent,
    },
  });
}
