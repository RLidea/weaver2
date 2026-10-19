import { PrismaClient } from '@weaver2/prisma';

/** 살아 있을 때만 끊는다 — 이미 끊긴 토큰의 처음 시각을 덮지 않는다 */
export async function RevokeApiTokenCommand(
  prisma: PrismaClient,
  id: string,
  now: Date,
  revokedById: string,
) {
  return prisma.apiToken.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: now, revokedById },
  });
}
