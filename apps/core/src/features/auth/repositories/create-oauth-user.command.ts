import { PrismaService } from '@weaver2/prisma';
import { Prisma } from '@prisma/client';

export async function CreateOAuthUserCommand(
  prisma: PrismaService,
  options: {
    username: string;
    displayName: string;
    email: string;
    provider: string;
    providerId: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: Date;
  },
): Promise<{ userId: string; authId: string }> {
  const { username, displayName, email, provider, providerId, accessToken, refreshToken, tokenExpiry } = options;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.create({
      data: { username, displayName },
    });

    const auth = await tx.auth.create({
      data: {
        email,
        password: null,
        isVerified: true,
        userId: user.id,
      },
    });

    await tx.oAuthConnection.create({
      data: { provider, providerId, accessToken, refreshToken, tokenExpiry, authId: auth.id },
    });

    return { userId: user.id, authId: auth.id };
  });
}
