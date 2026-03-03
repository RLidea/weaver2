import { PrismaClient } from '@prisma/client';

export async function FindUserByDisplayNameQuery(
  prisma: PrismaClient,
  displayName: string,
) {
  return prisma.user.findUnique({
    where: { displayName },
  });
}
