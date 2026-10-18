import { PrismaClient, TwoFactorKind } from '@weaver2/prisma';

/**
 * 2FA 수단 하나를 지우고, 남은 **확인된** 수단 수를 돌려준다. 마지막 수단이어도 지운다.
 *
 * 그 사람의 수단 행을 FOR UPDATE 로 잠그고 같은 트랜잭션에서 지운 뒤 센다. TOTP 해제와 이메일 해제가
 * 동시에 와도 늦게 온 쪽이 먼저 온 쪽이 끝난 뒤의 상태를 보므로, 「0개가 됐다」는 정확히 한 번만 나온다
 * (꺼짐 알림이 두 번 가거나 한 번도 안 가지 않게).
 */
export async function DeleteTwoFactorMethodCommand(
  prisma: PrismaClient,
  userId: string,
  kind: TwoFactorKind,
): Promise<{ remaining: number }> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { kind: TwoFactorKind; confirmed: boolean }[]
    >`
      SELECT kind, "confirmedAt" IS NOT NULL AS confirmed
        FROM two_factor_methods
       WHERE "userId" = ${userId}
       FOR UPDATE`;
    await tx.twoFactorMethod.deleteMany({ where: { userId, kind } });
    return {
      remaining: rows.filter((r) => r.kind !== kind && r.confirmed).length,
    };
  });
}
