/**
 * 프로필 이미지를 files 로 옮길 준비 — `pnpm files:prepare-profile-import`.
 *
 * 프로필 이미지는 지금까지 행이 없이 users.profileImagePath 문자열뿐이었다. `file_access_expand`
 * 마이그레이션이 그 파일들의 files 행을 만드는데, 크기는 저장소에 물어야 해서 SQL 로는 못 한다.
 * 그래서 배포 **전에, 옛 스키마에서** 이 스크립트가 저장소를 읽어 크기와 형식을 임시 테이블
 * `_profile_image_import` 에 써 둔다. 마이그레이션은 그 표로 행을 만들고 표를 지운다.
 * 몇 번 돌려도 같다(표를 다시 채운다). 프로필 이미지가 없는 프로젝트는 돌릴 필요가 없다.
 *
 * 저장소에 없는 파일이나 형식을 알 수 없는 확장자가 있으면 표를 쓰지 않고 멈춘다 —
 * 마이그레이션도 그 사용자를 보고 멈추므로, 사람이 먼저 정리한다(경로를 비우는 등).
 */
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { createSeedPrismaClient } from '../prisma/seed/seed-client';
import {
  LocalStorageProvider,
  S3StorageProvider,
  StorageProvider,
  uploadTypeByExtension,
} from '@weaver2/upload';

const envFile = 'apps/core-backend/.env';
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

function storageFromEnv(): StorageProvider {
  return process.env.STORAGE_DRIVER === 's3'
    ? new S3StorageProvider(new ConfigService())
    : new LocalStorageProvider();
}

async function sizeOf(
  storage: StorageProvider,
  key: string,
): Promise<number | null> {
  const stream = await storage.read(key);
  if (!stream) return null;
  let size = 0;
  for await (const chunk of stream) {
    size += (chunk as Buffer).length;
  }
  return size;
}

async function main() {
  const prisma = createSeedPrismaClient();
  const storage = storageFromEnv();
  try {
    const users = await prisma.$queryRaw<
      { id: string; profileImagePath: string }[]
    >`SELECT id, "profileImagePath" FROM users WHERE "profileImagePath" IS NOT NULL`;

    const rows: { userId: string; size: number; mimeType: string }[] = [];
    const problems: string[] = [];
    for (const user of users) {
      const type = uploadTypeByExtension(path.extname(user.profileImagePath));
      if (!type) {
        problems.push(
          `${user.id}: 형식을 알 수 없는 확장자 (${user.profileImagePath})`,
        );
        continue;
      }
      const size = await sizeOf(storage, user.profileImagePath);
      if (size === null) {
        problems.push(`${user.id}: 저장소에 없음 (${user.profileImagePath})`);
        continue;
      }
      rows.push({ userId: user.id, size, mimeType: type.contentType });
    }

    if (problems.length > 0) {
      console.error(
        `프로필 이미지 ${problems.length}개를 옮길 수 없습니다 — 정리한 뒤 다시 돌리세요:\n  ${problems.join('\n  ')}`,
      );
      process.exitCode = 1;
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`DROP TABLE IF EXISTS "_profile_image_import"`;
      await tx.$executeRaw`
        CREATE TABLE "_profile_image_import" (
          "userId" TEXT PRIMARY KEY, size INTEGER NOT NULL, "mimeType" TEXT NOT NULL)`;
      for (const row of rows) {
        await tx.$executeRaw`
          INSERT INTO "_profile_image_import" ("userId", size, "mimeType")
          VALUES (${row.userId}, ${row.size}, ${row.mimeType})`;
      }
    });
    console.log(
      `프로필 이미지 ${rows.length}개의 크기를 _profile_image_import 에 썼습니다.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
