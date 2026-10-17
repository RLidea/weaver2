import { PrismaClient } from '@weaver2/prisma';
import { normalizeEmail } from '../utils/email.util';

export async function FindUserByEmailQuery(
  prisma: PrismaClient,
  email: string,
) {
  return prisma.user.findFirst({
    where: { email: normalizeEmail(email), deletedAt: null },
    include: {
      userSetting: true,
      localCredential: true,
      // 확인된 2FA 수단만 — 로그인이 pre-auth 로 갈지 정한다
      twoFactorMethods: {
        where: { confirmedAt: { not: null } },
        select: { kind: true },
      },
    },
  });
}
