// Prisma CLI 설정 (Prisma 7). generate·migrate·db seed 가 전부 이 파일을 읽는다.
// 경로는 이 파일 기준으로 풀린다.
import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 CLI 는 .env 를 스스로 읽지 않는다. 백엔드 .env 를 여기서 읽는다.
// 이미 셸에 있는 변수는 덮어쓰지 않는다 — 통합 테스트·CI 가 DATABASE_URL 을 바꿔 끼울 수 있게.
const envFile = 'apps/core-backend/.env';
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export default defineConfig({
  schema: 'apps/core-backend/prisma/schema',
  migrations: {
    path: 'apps/core-backend/prisma/schema/migrations',
    seed: 'ts-node -r tsconfig-paths/register --transpile-only apps/core-backend/prisma/seed/seed.ts',
  },
  datasource: {
    // generate 는 DB 에 붙지 않는다. CI 의 generate 단계처럼 URL 이 없을 때도 죽지 않도록
    // env() 대신 자리표시자를 둔다 (env() 는 변수가 없으면 던진다).
    url:
      process.env.DATABASE_URL ??
      'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
