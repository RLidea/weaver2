import { PrismaService } from '@weaver2/prisma';

export function UpdateVerifiedCommand(
  prisma: PrismaService,
  options: { userId: string; email: string },
) {
  return prisma.auth.update({
    where: { userId: options.userId, email: options.email },
    data: { isVerified: true },
  });
}
