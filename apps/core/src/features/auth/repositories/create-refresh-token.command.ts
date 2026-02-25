import { PrismaClient } from '@prisma/client';

export async function CreateRefreshTokenCommand(
  prisma: PrismaClient,
  userId: string,
  token: string,
  expires: Date,
) {
  return prisma.refreshToken.create({
    data: {
      token,
      userId,
      expires,
    },
  });
}
