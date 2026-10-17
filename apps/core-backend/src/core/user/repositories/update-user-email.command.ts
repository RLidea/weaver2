import { PrismaClient } from '@weaver2/prisma';
import { normalizeEmail } from '../../auth/utils/email.util';

export async function UpdateUserEmailCommand(
  prisma: PrismaClient,
  userId: string,
  newEmail: string,
) {
  return prisma.user.update({
    where: { id: userId },
    data: { email: normalizeEmail(newEmail) },
  });
}
