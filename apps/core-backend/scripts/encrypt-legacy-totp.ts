/**
 * 평문으로 남은 TOTP 비밀을 암호문(v1)으로 바꾼다 — `pnpm auth:encrypt-legacy-totp`.
 *
 * 암호화가 들어오기 전에 저장된 비밀은 평문이고, 지금은 읽을 때마다 조용히 다시 암호화된다
 * (two-factor.service 의 지연 재암호화). 그 사용자가 로그인하지 않으면 평문이 영원히 남는다.
 * `auth_credential_expand` 마이그레이션은 켜져 있는 평문 비밀이 있으면 멈추므로, 그 전에
 * **옛 스키마에서** 이 스크립트를 한 번 돌린다. 몇 번 돌려도 같다(이미 v1 이면 건드리지 않는다).
 *
 * Prisma 모델이 아니라 SQL 로 읽고 쓴다 — 스키마가 바뀌는 중에도 local_credentials 의
 * 옛 컬럼만 보면 되게.
 */
import { existsSync } from 'node:fs';
import { createSeedPrismaClient } from '../prisma/seed/seed-client';
import {
  encryptSecret,
  isEncryptedSecret,
} from '../src/core/auth/utils/auth-crypto.util';

const envFile = 'apps/core-backend/.env';
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

async function main() {
  const prisma = createSeedPrismaClient();
  try {
    const rows = await prisma.$queryRaw<{ id: string; totpSecret: string }[]>`
      SELECT id, "totpSecret" FROM local_credentials
       WHERE "totpSecret" IS NOT NULL AND "totpSecret" NOT LIKE 'v1:%'`;

    let updated = 0;
    for (const row of rows) {
      if (isEncryptedSecret(row.totpSecret)) continue;
      // 읽은 값 그대로일 때만 바꾼다 — 그사이 로그인으로 재암호화됐으면 건너뛴다
      updated += await prisma.$executeRaw`
        UPDATE local_credentials SET "totpSecret" = ${encryptSecret(row.totpSecret)}
         WHERE id = ${row.id} AND "totpSecret" = ${row.totpSecret}`;
    }
    console.log(
      `평문 TOTP 비밀 ${rows.length}개 중 ${updated}개를 암호화했습니다.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
