/**
 * module:remove — 메인 코드베이스에서 모듈을 제거한다.
 *
 * 사용: pnpm module:remove banner
 *
 * 순서:
 *  0) assertCleanWorktree — 미커밋 변경 위에 덮어쓰기 방지 (git restore 복구 가능 보장)
 *  1) analyzeRemoval — 하류 의존 경고 (banner는 [] 기대)
 *  2) 등록 제거 (footprint 파일 삭제 전에)
 *     ★ removePermissionGroupSeed를 removePermissions보다 먼저 —
 *       시드가 PERMISSIONS.BANNER.ALL을 참조하므로, PERMISSIONS.BANNER를
 *       지우기 전에 참조부터 끊어야 컴파일이 안 깨진다(self-contained 성립 조건).
 *  3) footprint 파일 삭제
 *  4) migrate 안내 출력 (DB DROP은 사용자가 직접)
 */
import { ALL_MANIFESTS } from '../../apps/core-backend/src/features/manifests';
import { buildDependencyGraph, analyzeRemoval } from '@weaver2/module-registry';
import { assertCleanWorktree } from './lib/git-guard';
import { removePath } from './lib/footprint-io';
import {
  removeBackendRegistration,
  removePermissions,
  removeSidebar,
  removeCommonPermissions,
  removePermissionGroupSeed,
} from './lib/registration';
import { removeBackref } from './lib/prisma-backref';

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

// 0) 워킹트리 청결 확인 (실제 파일을 삭제하므로 필수)
assertCleanWorktree();

// eslint-disable-next-line no-console
console.log(`\n[module:remove] ${id}`);

// 1) 하류 의존 분석 (banner는 [] 기대)
const graph = buildDependencyGraph(ALL_MANIFESTS);
const impact = analyzeRemoval(graph, id);
if (impact.affectedDependents.length > 0) {
  // eslint-disable-next-line no-console
  console.warn('⚠️ 하류 의존(이 모듈에 의존하는 모듈):', impact.affectedDependents.join(', '));
  if (impact.hardBlockers.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      '   끊어야 할 hard 역의존:',
      impact.hardBlockers.map((e) => `${e.from}→${e.to}`).join(', '),
    );
  }
} else {
  // eslint-disable-next-line no-console
  console.log('  하류 의존 없음 (self-contained)');
}

const fp = manifest.footprint;

// 2) 등록 제거 (footprint 파일 삭제 전에)
// eslint-disable-next-line no-console
console.log('\n[등록 제거]');
removePermissionGroupSeed(ROOT); // ★ PERMISSIONS.BANNER 삭제보다 먼저 (참조 끊기)
removeBackendRegistration(ROOT);
removePermissions(ROOT);
removeSidebar(ROOT);
removeCommonPermissions(ROOT);
removeBackref(ROOT);

// 3) footprint 파일 삭제
// eslint-disable-next-line no-console
console.log('\n[footprint 파일 삭제]');
const targets: string[] = [
  fp.backendDir,
  ...(fp.frontendDirs ?? []),
  ...(fp.routes ?? []),
  ...(fp.seeds ?? []),
  fp.prismaSchema,
].filter((r): r is string => Boolean(r));

for (const rel of targets) {
  removePath(ROOT, rel);
}

// 4) migrate 안내
// eslint-disable-next-line no-console
console.log('\n✅ banner 제거 완료. 다음을 직접 실행하세요:');
// eslint-disable-next-line no-console
console.log('   1) pnpm db:core:generate  (banner.prisma 삭제 반영 — Banner 타입 제거)');
// eslint-disable-next-line no-console
console.log('   2) pnpm db:core:migrate --name drop_banner  (banners 테이블 DROP — 데이터 손실)');
// eslint-disable-next-line no-console
console.log('   3) pnpm -w typecheck && pnpm build:core && pnpm build:web');
