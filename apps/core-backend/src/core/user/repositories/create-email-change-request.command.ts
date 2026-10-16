import { PrismaClient } from '@weaver2/prisma';
import { normalizeEmail } from '../../auth/utils/email.util';

export async function CreateEmailChangeRequestCommand(
  prisma: PrismaClient,
  userId: string,
  newEmail: string,
  codeHash: string,
  expiresAt: Date,
) {
  // Delete any existing requests for this user before creating a new one
  await prisma.emailChangeRequest.deleteMany({ where: { userId } });

  return prisma.emailChangeRequest.create({
    data: {
      userId,
      newEmail: normalizeEmail(newEmail),
      codeHash,
      expiresAt,
    },
  });
}
