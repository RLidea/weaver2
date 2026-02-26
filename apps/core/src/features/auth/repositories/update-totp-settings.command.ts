import { PrismaClient } from '@prisma/client';

export async function UpdateTotpSettingsCommand(
  prisma: PrismaClient,
  userId: string,
  data: { totpEnabled: boolean; totpSecret?: string | null },
) {
  return prisma.localCredential.update({
    where: { userId },
    data,
  });
}
