import { PrismaClient } from '@weaver2/prisma';

/**
 * TOTP 등록을 시작한다 — 새 비밀(암호문)을 쓰되 **확인된 TOTP 가 없을 때만**.
 * 등록 중이던 행은 새 비밀로 덮는다. 확인된 TOTP 가 있었으면 false.
 *
 * 조건을 ON CONFLICT … WHERE 에 둔다. 읽고 나서 쓰면 그 사이에 등록 확인이 끼어
 * 켜진 TOTP 를 덮을 수 있다 — 덮으면 「등록 시작」 한 번으로 2FA 가 꺼진다.
 * 시각은 앱이 넘긴다(컬럼은 UTC 벽시계 값, DB 세션 시간대와 무관하게).
 */
export async function StartTotpSetupCommand(
  prisma: PrismaClient,
  userId: string,
  encryptedSecret: string,
): Promise<boolean> {
  const now = new Date();
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO two_factor_methods (id, "userId", kind, "secretEncrypted", "createdAt")
    VALUES (gen_random_uuid()::text, ${userId}, 'TOTP', ${encryptedSecret}, ${now}::timestamp(3))
    ON CONFLICT ("userId", kind) DO UPDATE SET
      "secretEncrypted"  = EXCLUDED."secretEncrypted",
      "lastUsedTimeStep" = NULL,
      "createdAt"        = EXCLUDED."createdAt"
    WHERE two_factor_methods."confirmedAt" IS NULL
    RETURNING id`;
  return rows.length === 1;
}
