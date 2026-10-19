import { Prisma } from '@weaver2/prisma';

/**
 * back-channel 로그아웃이 이 세션을 끝냈나 — 지우기와 경합한 회전이 남긴 행을 막는 둘째 문이다.
 *
 * - 행의 `oidcSid` 가 `oidc_revoked_sids` 에 있다(그 묘비에 sub 가 있으면 행 주인의 `ssoSubject` 와 같을 때만)
 * - 행이 `users.sessionsRevokedAt`(sub 로 모든 세션을 끝낸 시각)보다 먼저 만들어졌다
 */
export async function IsRefreshSessionRevokedQuery(
  tx: Prisma.TransactionClient,
  row: { userId: string; oidcSid: string | null; createdAt: Date },
  now: Date,
): Promise<boolean> {
  const user = await tx.user.findUnique({
    where: { id: row.userId },
    select: { ssoSubject: true, sessionsRevokedAt: true },
  });
  if (user?.sessionsRevokedAt && row.createdAt <= user.sessionsRevokedAt) {
    return true;
  }
  if (!row.oidcSid) return false;
  const tombstone = await tx.oidcRevokedSid.findUnique({
    where: { sid: row.oidcSid },
  });
  return (
    !!tombstone &&
    tombstone.expiresAt > now &&
    (!tombstone.sub || tombstone.sub === user?.ssoSubject)
  );
}
