import { PrismaService } from '@weaver2/prisma';

export function UpdateVerifiedCommand(
  prisma: PrismaService,
  options: { userId: string },
) {
  return prisma.localCredential.update({
    where: { userId: options.userId },
    data: { isVerified: true },
  });
}
