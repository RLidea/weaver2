import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@weaver2/prisma';

/**
 * 시드용 PrismaClient. Prisma 7 은 드라이버 어댑터가 필수라 여기서 붙인다.
 * DATABASE_URL 은 `prisma db seed`(prisma.config.ts 가 .env 를 읽는다) 또는 호출한 셸이 준다.
 * 쓰고 나면 반드시 `$disconnect()` 한다 — pg 풀이 열려 있으면 프로세스가 끝나지 않는다.
 */
export function createSeedPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL 이 없습니다 — apps/core-backend/.env 를 확인하세요.',
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
