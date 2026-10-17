import { PrismaClient } from '@weaver2/prisma';

/**
 * TOTP 등록을 시작한다 — 새 비밀(암호문)을 쓰되 **꺼져 있을 때만**.
 *
 * 조건을 WHERE 에 둔다. 읽고 나서 쓰면 그 사이에 등록 확인이 끼어 켜진 TOTP 를
 * 덮을 수 있다. 켜져 있었으면 false 를 돌려준다.
 */
export async function StartTotpSetupCommand(
  prisma: PrismaClient,
  userId: string,
  encryptedSecret: string,
): Promise<boolean> {
  const { count } = await prisma.localCredential.updateMany({
    where: { userId, totpEnabled: false },
    data: { totpSecret: encryptedSecret },
  });
  return count === 1;
}
