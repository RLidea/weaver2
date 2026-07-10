import { PrismaClient } from '@prisma/client';
import { hashToken } from '../utils/auth-crypto.util';

/** 원문 재설정 토큰을 받아 해시로 저장한다(원문은 이메일 링크로만 전달). */
export async function UpdateLocalCredentialResetTokenCommand(
  prisma: PrismaClient,
  userId: string,
  token: string,
  expiry: Date,
) {
  return prisma.localCredential.update({
    where: { userId },
    data: {
      passwordResetToken: hashToken(token),
      resetTokenExpiry: expiry,
    },
  });
}
