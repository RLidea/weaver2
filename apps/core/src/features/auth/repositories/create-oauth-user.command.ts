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
): Promise<{ userId: string }> {
  const {
    username,
    displayName,
    email,
    provider,
    providerId,
    accessToken,
    refreshToken,
    tokenExpiry,
  } = options;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.create({
      data: { username, displayName, email },
    });

    await tx.oAuthAccount.create({
      data: {
        provider,
        providerId,
        accessToken,
        refreshToken,
        tokenExpiry,
        userId: user.id,
      },
    });

    return { userId: user.id };
  });
}
