import { PrismaClient } from '@weaver2/prisma';

export async function UpdateEmailOtpSettingsCommand(
  prisma: PrismaClient,
  userId: string,
  emailOtpEnabled: boolean,
) {
  return prisma.localCredential.update({
    where: { userId },
    data: { emailOtpEnabled },
  });
}
