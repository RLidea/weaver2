import { PrismaClient } from '@weaver2/prisma';

/**
 * 등록 중인 TOTP 를 확인된 것으로 바꾼다 — **코드를 확인한 바로 그 비밀**이 아직 DB 에
 * 있을 때만. 확인에 쓴 코드의 시간 단위도 남겨, 그 코드로 곧바로 로그인하지 못하게 한다.
 *
 * 확인하는 동안 다른 탭에서 등록을 다시 시작하면 비밀이 바뀐다. 그대로 켜면 사용자의
 * 인증 앱에 없는 비밀로 2FA 가 켜져 다음 로그인부터 잠긴다. 바뀌었으면 false.
 */
export async function ConfirmTotpSetupCommand(
  prisma: PrismaClient,
  userId: string,
  verifiedEncryptedSecret: string,
  timeStep: number,
): Promise<boolean> {
  const { count } = await prisma.twoFactorMethod.updateMany({
    where: {
      userId,
      kind: 'TOTP',
      confirmedAt: null,
      secretEncrypted: verifiedEncryptedSecret,
    },
    data: { confirmedAt: new Date(), lastUsedTimeStep: timeStep },
  });
  return count === 1;
}
