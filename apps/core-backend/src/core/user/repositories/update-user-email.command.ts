import { PrismaClient } from '@weaver2/prisma';
import { normalizeEmail } from '../../auth/utils/email.util';

/**
 * 이메일을 바꾼다. 코드로 새 주소의 주인임이 증명됐으므로 인증 시각도 새로 정하고,
 * 옛 주소로 나간 재설정·인증 링크는 버린다 — 옛 메일함이 털려 주소를 옮긴 사람이 그
 * 링크로 다시 털리지 않게.
 */
export async function UpdateUserEmailCommand(
  prisma: PrismaClient,
  userId: string,
  newEmail: string,
) {
  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { email: normalizeEmail(newEmail), emailVerifiedAt: new Date() },
    }),
    prisma.oneTimeCode.deleteMany({
      where: {
        userId,
        purpose: { in: ['PASSWORD_RESET', 'EMAIL_VERIFICATION'] },
      },
    }),
  ]);
  return user;
}
