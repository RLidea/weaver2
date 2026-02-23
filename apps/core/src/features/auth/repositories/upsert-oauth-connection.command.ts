import { PrismaClient } from '@prisma/client';

export function UpsertOAuthConnectionCommand(
  prisma: PrismaClient,
  options: {
    authId: string;
    provider: string;
    providerId: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: Date;
  },
) {
  const {
    authId,
    provider,
    providerId,
    accessToken,
    refreshToken,
    tokenExpiry,
  } = options;
  return prisma.oAuthConnection.upsert({
    where: { provider_providerId: { provider, providerId } },
    create: {
      authId,
      provider,
      providerId,
      accessToken,
      refreshToken,
      tokenExpiry,
    },
    update: { accessToken, refreshToken, tokenExpiry },
  });
}
