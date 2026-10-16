import { PrismaClient } from '@weaver2/prisma';

export async function UpdateLocalCredentialPasswordCommand(
  prisma: PrismaClient,
  userId: string,
  hashedPassword: string,
  options: { markVerified?: boolean } = {},
) {
  return prisma.localCredential.update({
    where: { userId },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      resetTokenExpiry: null,
      ...(options.markVerified && {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      }),
    },
  });
}
