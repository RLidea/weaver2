import { PrismaClient } from '@prisma/client';

export function UpsertOAuthAccountCommand(
  prisma: PrismaClient,
  options: {
    userId: string;
    provider: string;
    providerId: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: Date;
  },
) {
  const {
    userId,
    provider,
    providerId,
    accessToken,
    refreshToken,
    tokenExpiry,
  } = options;
  return prisma.oAuthAccount.upsert({
    where: { provider_providerId: { provider, providerId } },
    create: {
      userId,
      provider,
      providerId,
      accessToken,
      refreshToken,
      tokenExpiry,
    },
    update: { accessToken, refreshToken, tokenExpiry },
  });
}
