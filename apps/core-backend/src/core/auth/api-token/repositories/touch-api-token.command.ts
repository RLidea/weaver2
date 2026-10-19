import { PrismaClient } from '@weaver2/prisma';

export async function TouchApiTokenCommand(
  prisma: PrismaClient,
  id: string,
  now: Date,
) {
  await prisma.apiToken.update({
    where: { id },
    data: { lastUsedAt: now },
  });
}
