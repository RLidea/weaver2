import { PrismaClient, TwoFactorKind } from '@weaver2/prisma';

/**
 * 2FA 수단 하나를 지우되, **확인된 다른 수단이 남을 때만**. 지웠으면 true.
 *
 * 「둘 다 있는지 읽고 → 지우기」로 하면, TOTP 해제와 이메일 해제가 동시에 와서 둘 다
 * 「다른 것이 있다」고 읽고 둘 다 지워 2FA 가 0개가 된다. 그 사람의 수단 행을 FOR UPDATE 로
 * 잠그고 같은 트랜잭션에서 확인·삭제해, 늦게 온 쪽은 먼저 온 쪽이 끝난 뒤의 상태를 본다.
 */
export async function DeleteTwoFactorMethodIfOtherRemainsCommand(
  prisma: PrismaClient,
  userId: string,
  kind: TwoFactorKind,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { kind: TwoFactorKind; confirmed: boolean }[]
    >`
      SELECT kind, "confirmedAt" IS NOT NULL AS confirmed
        FROM two_factor_methods
       WHERE "userId" = ${userId}
       FOR UPDATE`;
    if (!rows.some((r) => r.kind !== kind && r.confirmed)) return false;
    const { count } = await tx.twoFactorMethod.deleteMany({
      where: { userId, kind },
    });
    return count === 1;
  });
}
