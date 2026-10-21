import { Prisma } from '@weaver2/prisma';

/**
 * 트랜잭션이 끝날 때까지 그 사람들의 `users` 행을 잠근다(`SELECT … FOR UPDATE`, id 순서로 — 교착을 피한다).
 * refresh 회전과 back-channel 로그아웃이 같은 사람을 두고 줄을 서게 한다 — 그러지 않으면 회전이 로그아웃의
 * 지우기 사이에 끼어 끝난 sid 로 새 행을 남긴다. 로그인과 비밀번호 변경 · 재설정도 같은 잠금으로 줄을 선다 —
 * 옛 비밀번호로 맞춰 본 로그인이 변경의 토큰 지우기 뒤에 새 refresh 행을 남기지 않게.
 */
export async function LockUsersCommand(
  tx: Prisma.TransactionClient,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return;
  await tx.$queryRaw`SELECT 1 FROM "users" WHERE "id" = ANY(${[...userIds].sort()}::text[]) ORDER BY "id" FOR UPDATE`;
}
