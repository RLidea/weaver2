import { PrismaClient, TwoFactorKind } from '@weaver2/prisma';

/** 2FA 수단 하나를 지운다(등록 중이던 TOTP 포함). */
export async function DeleteTwoFactorMethodCommand(
  prisma: PrismaClient,
  userId: string,
  kind: TwoFactorKind,
): Promise<void> {
  await prisma.twoFactorMethod.deleteMany({ where: { userId, kind } });
}
