import { PrismaClient } from '@weaver2/prisma';

/** 인증용 — 해시 대조와 주인의 상태(탈퇴 · 정지)까지 한 번에 읽는다 */
export async function FindApiTokenByPrefixQuery(
  prisma: PrismaClient,
  prefix: string,
) {
  return prisma.apiToken.findUnique({
    where: { prefix },
    select: {
      id: true,
      tokenHash: true,
      scopes: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          deletedAt: true,
          suspendedUntil: true,
        },
      },
    },
  });
}
