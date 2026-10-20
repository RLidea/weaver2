import { Prisma } from '@weaver2/prisma';
import { IsOidcSidRevokedQuery } from './is-oidc-sid-revoked.query';

/**
 * back-channel 로그아웃이 이 세션을 끝냈나 — 지우기와 경합한 회전이 남긴 행을 막는 둘째 문이다.
 *
 * - 행의 `oidcSid` 가 `oidc_revoked_sids` 에 있다(그 묘비에 sub 가 있으면 행 주인의 `ssoSubject` 와 같을 때만)
 * - 행이 `users.sessionsRevokedAt`(sub 로 모든 세션을 끝낸 시각)보다 먼저 만들어졌다 — 두 시각 모두 앱
 *   프로세스의 시계다(`createdAt` 도 Prisma 가 클라이언트에서 채운다). 백엔드를 여러 기계에 띄우면 기계끼리
 *   시계를 맞춘다(NTP)
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
  return IsOidcSidRevokedQuery(tx, row.oidcSid, user?.ssoSubject, now);
}
