import { Prisma, PrismaClient, TwoFactorMethod } from '@weaver2/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export interface TwoFactorMethods {
  /** 등록 중(confirmedAt = null)인 것도 담는다 — 확인된 것만 보려면 confirmedTotp */
  totp: TwoFactorMethod | null;
  /** 확인된 TOTP. 로그인·해제가 쓰는 것은 이것뿐이다 */
  confirmedTotp: TwoFactorMethod | null;
  email: TwoFactorMethod | null;
}

/** 사람에 붙은 2FA 수단(종류별 하나)을 한 번에 읽는다. */
export async function FindTwoFactorMethodsQuery(
  prisma: Db,
  userId: string,
): Promise<TwoFactorMethods> {
  const rows = await prisma.twoFactorMethod.findMany({ where: { userId } });
  const totp = rows.find((r) => r.kind === 'TOTP') ?? null;
  return {
    totp,
    confirmedTotp: totp?.confirmedAt ? totp : null,
    email: rows.find((r) => r.kind === 'EMAIL') ?? null,
  };
}
