import { PrismaService } from '@weaver2/prisma';

export function FindLocalCredentialByTokenQuery(
  prisma: PrismaService,
  options: {
    verificationToken: string;
  },
) {
  return prisma.localCredential.findUnique({
    where: { verificationToken: options.verificationToken },
  });
}
