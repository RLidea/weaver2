import { PrismaClient } from '@prisma/client';

export async function CreateRefreshTokenCommand(
  prisma: PrismaClient,
  userId: string,
  token: string,
  expires: Date,
  ipAddress?: string,
  userAgent?: string,
) {
  return prisma.refreshToken.create({
    data: {
      token,
      userId,
      expires,
      ipAddress,
      userAgent,
    },
  });
}
