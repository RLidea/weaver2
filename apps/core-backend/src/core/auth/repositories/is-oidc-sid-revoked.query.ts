import { Prisma } from '@weaver2/prisma';

/**
 * back-channel 로그아웃이 이 SSO 세션(sid)을 끝냈나 — `oidc_revoked_sids` 의 묘비를 PK 로 하나 읽는다.
 *
 * - 묘비가 있고 아직 살아 있다(`expiresAt > now`). 지난 묘비는 다음 로그아웃이 치우기 전까지 남아 있을 수 있다
 * - 묘비에 sub 가 있으면 그 사람(`ssoSubject`)일 때만 — sid 가 엉뚱한 사람의 세션과 겹쳐도 끊지 않는다
 *
 * refresh 회전(IsRefreshSessionRevokedQuery)과 액세스 토큰 검증(JwtStrategy)이 같은 판단을 쓴다.
 */
export async function IsOidcSidRevokedQuery(
  tx: Prisma.TransactionClient,
  sid: string,
  ssoSubject: string | null | undefined,
  now: Date,
): Promise<boolean> {
  const tombstone = await tx.oidcRevokedSid.findUnique({ where: { sid } });
  return (
    !!tombstone &&
    tombstone.expiresAt > now &&
    (!tombstone.sub || tombstone.sub === ssoSubject)
  );
}
