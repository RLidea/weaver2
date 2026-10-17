import { PrismaClient } from '@weaver2/prisma';
import { normalizeEmail } from '../utils/email.util';

export async function FindUserByEmailQuery(
  prisma: PrismaClient,
  email: string,
) {
  return prisma.user.findFirst({
    where: { email: normalizeEmail(email), deletedAt: null },
    include: { userSetting: true, localCredential: true },
  });
}
