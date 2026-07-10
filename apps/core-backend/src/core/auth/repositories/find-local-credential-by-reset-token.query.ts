import { PrismaClient } from '@prisma/client';
import { hashToken } from '../utils/auth-crypto.util';

/** 원문 재설정 토큰을 해시해 조회한다(DB는 해시 저장). */
export async function FindLocalCredentialByResetTokenQuery(
  prisma: PrismaClient,
  token: string,
) {
  return prisma.localCredential.findFirst({
    where: {
      passwordResetToken: hashToken(token),
      resetTokenExpiry: {
        gte: new Date(),
      },
    },
  });
}
