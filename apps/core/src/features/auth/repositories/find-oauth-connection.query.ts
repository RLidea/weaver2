import { PrismaClient } from '@prisma/client';

export function FindOAuthConnectionQuery(
  prisma: PrismaClient,
  provider: string,
  providerId: string,
) {
  return prisma.oAuthConnection.findUnique({
    where: { provider_providerId: { provider, providerId } },
    include: { auth: { include: { user: true } } },
  });
}
