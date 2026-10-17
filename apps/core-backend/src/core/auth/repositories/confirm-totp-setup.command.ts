import { PrismaClient } from '@weaver2/prisma';

/**
 * 등록 중인 TOTP 를 켠다 — **코드를 확인한 바로 그 비밀**이 아직 DB 에 있을 때만.
 *
 * 확인하는 동안 다른 탭에서 등록을 다시 시작하면 비밀이 바뀐다. 그대로 켜면 사용자의
 * 인증 앱에 없는 비밀로 2FA 가 켜져 다음 로그인부터 잠긴다. 바뀌었으면 false.
 */
export async function ConfirmTotpSetupCommand(
  prisma: PrismaClient,
  userId: string,
  verifiedEncryptedSecret: string,
): Promise<boolean> {
  const { count } = await prisma.localCredential.updateMany({
    where: { userId, totpEnabled: false, totpSecret: verifiedEncryptedSecret },
    data: { totpEnabled: true },
  });
  return count === 1;
}
