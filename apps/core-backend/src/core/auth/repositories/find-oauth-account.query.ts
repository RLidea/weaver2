import { PrismaClient } from '@weaver2/prisma';

export function FindOAuthAccountQuery(
  prisma: PrismaClient,
  provider: string,
  providerId: string,
) {
  return prisma.oAuthAccount.findUnique({
    where: { provider_providerId: { provider, providerId } },
    include: { user: true },
  });
}
