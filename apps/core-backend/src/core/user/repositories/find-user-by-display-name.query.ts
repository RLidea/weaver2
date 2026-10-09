import { PrismaClient } from '@weaver2/prisma';

export async function FindUserByDisplayNameQuery(
  prisma: PrismaClient,
  displayName: string,
) {
  return prisma.user.findUnique({
    where: { displayName },
  });
}
