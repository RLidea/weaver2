import { PrismaService } from '@weaver2/prisma';

export function FindAuthByTokenQuery(
  prisma: PrismaService,
  options: {
    verificationToken: string;
  },
) {
  return prisma.auth.findUnique({
    where: { verificationToken: options.verificationToken },
  });
}
