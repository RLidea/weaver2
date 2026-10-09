import { PrismaClient } from '@weaver2/prisma';

export async function UpdateUserCommand(
  prisma: PrismaClient,
  userId: string,
  data: Record<string, unknown>,
) {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}
