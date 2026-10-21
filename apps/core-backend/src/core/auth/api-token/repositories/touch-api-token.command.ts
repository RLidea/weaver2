import { PrismaClient } from '@weaver2/prisma';

export async function TouchApiTokenCommand(
  prisma: PrismaClient,
  id: string,
  now: Date,
) {
  // updateMany — 그 사이 행이 지워졌어도(주인 영구 삭제) P2025 로 500 을 내지 않는다
  await prisma.apiToken.updateMany({
    where: { id },
    data: { lastUsedAt: now },
  });
}
