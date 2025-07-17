import { PrismaClient } from '@prisma/client';

export async function CreateRefreshTokenCommand(
  prisma: PrismaClient,
  authId: string,
  token: string,
  expires: Date,
) {
  return prisma.refreshToken.create({
    data: { token, authId, expires },
  });
}
