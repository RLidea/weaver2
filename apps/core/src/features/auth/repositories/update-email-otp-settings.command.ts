import { PrismaClient } from '@prisma/client';

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
