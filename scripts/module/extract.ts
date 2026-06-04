/**
 * module:extract — 메인 코드베이스 → catalog/modules/<id>/ 미러 복사
 *
 * 사용: pnpm module:extract banner
 *
 * footprint의 backendDir/frontendDirs/routes/prismaSchema/seeds를
 * catalog/modules/<id>/<원래상대경로> 로 원경로 구조를 보존하며 복사.
 * 메인 파일을 건드리지 않으므로 git-guard 불필요.
 */
import { ALL_MANIFESTS } from '../../apps/core-backend/src/features/manifests';
import { copyDir } from './lib/footprint-io';
import * as path from 'node:path';
import * as fs from 'node:fs';

const ROOT = process.cwd();
const id = process.argv[2] ?? 'banner';

const manifest = ALL_MANIFESTS.find((m) => m.id === id);
if (!manifest) {
  // eslint-disable-next-line no-console
  console.error(`manifest 없음: ${id}`);
  // eslint-disable-next-line no-console
  console.error('사용 가능한 id:', ALL_MANIFESTS.map((m) => m.id).join(', '));
  process.exit(1);
}

const CAT = `catalog/modules/${id}`;
const catAbs = path.join(ROOT, CAT);

// 기존 catalog 정리 후 재생성 (멱등)
if (fs.existsSync(catAbs)) {
  fs.rmSync(catAbs, { recursive: true, force: true });
}
fs.mkdirSync(catAbs, { recursive: true });

// eslint-disable-next-line no-console
console.log(`\n[module:extract] ${id} → ${CAT}`);

const fp = manifest.footprint;

// 복사 대상: 원경로 보존 미러 (catalog/modules/<id>/<원경로>)
// banner.feature.ts는 backendDir(features/banner) 내에 포함되므로 별도 복사 불필요.
const targets: string[] = [
  fp.backendDir,
  ...(fp.frontendDirs ?? []),
  ...(fp.routes ?? []),
  ...(fp.seeds ?? []),
  fp.prismaSchema,
].filter((r): r is string => Boolean(r));

for (const rel of targets) {
  copyDir(ROOT, rel, ROOT, `${CAT}/${rel}`);
}

// eslint-disable-next-line no-console
console.log(`\nextract 완료: ${CAT}`);
// eslint-disable-next-line no-console
console.log(`  총 ${targets.length}개 경로 미러`);
