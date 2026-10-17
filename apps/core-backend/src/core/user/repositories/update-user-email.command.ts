import { PrismaClient } from '@weaver2/prisma';
import { normalizeEmail } from '../../auth/utils/email.util';

/** 코드로 새 주소의 주인임이 증명됐으므로 인증 시각도 함께 새로 정한다. */
export async function UpdateUserEmailCommand(
  prisma: PrismaClient,
  userId: string,
  newEmail: string,
) {
  return prisma.user.update({
    where: { id: userId },
    data: { email: normalizeEmail(newEmail), emailVerifiedAt: new Date() },
  });
}
