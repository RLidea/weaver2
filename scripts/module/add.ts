/**
 * module:add — 카탈로그에서 모듈을 메인 코드베이스로 복원(설치)한다.
 *
 * 사용: pnpm module:add banner
 *
 * remove의 역연산:
 *  0) assertCleanWorktree — 미커밋 변경 위에 덮어쓰기 방지
 *  1) catalog/modules/<id>/<원경로> → <원경로> 복원
 *     extract가 원경로 구조를 보존했으므로, catalog 하위를 walk해서
 *     `catalog/modules/<id>/` 접두를 떼면 원경로가 된다. footprint를 다시
 *     참조할 필요 없이 디렉토리 구조로 복원.
 *  2) 등록 삽입
 *     ★ addPermissions(PERMISSIONS.BANNER)를 먼저, addPermissionGroupSeed
 *       (PERMISSIONS.BANNER.ALL 참조)를 그 다음 — 참조 대상이 먼저 존재해야 함.
 *  3) migrate 안내 출력 (DB는 사용자가 직접)
 */
import { assertCleanWorktree } from './lib/git-guard';
import {
  addBackendRegistration,
  addPermissions,
  addSidebar,
  addCommonPermissions,
  addPermissionGroupSeed,
} from './lib/registration';
import { addBackref } from './lib/prisma-backref';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();
const id = process.argv[2] ?? 'banner';

const CAT = `catalog/modules/${id}`;
const catAbs = path.join(ROOT, CAT);

if (!fs.existsSync(catAbs)) {
  // eslint-disable-next-line no-console
  console.error(`카탈로그 없음: ${CAT} (먼저 pnpm module:extract ${id} 실행)`);
  process.exit(1);
}

// 0) 워킹트리 청결 확인
assertCleanWorktree();

// eslint-disable-next-line no-console
console.log(`\n[module:add] ${id}`);

/**
 * 카탈로그 디렉토리를 재귀 walk하여 모든 파일의 원경로(catalog 접두 제거)를
 * 산출한다. 반환값은 catalog 루트(catAbs) 기준 상대경로 목록.
 */
function walkFiles(dir: string, baseAbs: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(abs, baseAbs));
    } else if (entry.isFile()) {
      out.push(path.relative(baseAbs, abs));
    }
  }
  return out;
}

// 1) catalog → 메인 복원 (원경로 구조 그대로)
// eslint-disable-next-line no-console
console.log('\n[카탈로그 복원]');
const relFiles = walkFiles(catAbs, catAbs);
for (const rel of relFiles) {
  const src = path.join(catAbs, rel);
  const dest = path.join(ROOT, rel); // rel이 곧 원경로 (catalog 접두 제거됨)
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest);
  // eslint-disable-next-line no-console
  console.log(`  → 복원: ${rel}`);
}

// 2) 등록 삽입
// eslint-disable-next-line no-console
console.log('\n[등록 삽입]');
addBackendRegistration(ROOT);
addPermissions(ROOT); // PERMISSIONS.BANNER 먼저 삽입
addPermissionGroupSeed(ROOT); // 그 다음 참조(BANNER.ALL) 삽입
addSidebar(ROOT);
addCommonPermissions(ROOT);
addBackref(ROOT);

// 3) migrate 안내
// eslint-disable-next-line no-console
console.log('\n✅ banner 설치 완료. 다음을 직접 실행하세요:');
// eslint-disable-next-line no-console
console.log('   1) pnpm db:core:generate  (banner.prisma 반영 — Banner 타입 복원)');
// eslint-disable-next-line no-console
console.log('   2) pnpm db:core:migrate --name add_banner  (banners 테이블 생성)');
// eslint-disable-next-line no-console
console.log('   3) pnpm -w typecheck && pnpm build:core && pnpm build:web');
