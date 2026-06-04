import * as fs from 'node:fs';
import * as path from 'node:path';

function assertWithinRoot(root: string, abs: string, rel: string): void {
  const resolvedRoot = path.resolve(root);
  if (abs !== resolvedRoot && !abs.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`경로 탈출 감지: ${rel} → ${abs}`);
  }
}

/**
 * 파일 또는 디렉토리를 삭제한다. rel이 없으면 skip(멱등).
 * root 외부 경로는 throw.
 */
export function removePath(root: string, rel: string): void {
  if (!rel) return;
  const abs = path.resolve(root, rel);
  assertWithinRoot(root, abs, rel);
  if (fs.existsSync(abs)) {
    fs.rmSync(abs, { recursive: true, force: true });
    // eslint-disable-next-line no-console
    console.log(`  ✗ 삭제: ${rel}`);
  }
}

/**
 * 파일 또는 디렉토리를 복사한다. src가 없으면 skip(멱등).
 * src/dest 모두 각 root 외부 경로는 throw.
 */
export function copyDir(srcRoot: string, srcRel: string, destRoot: string, destRel: string): void {
  const src = path.resolve(srcRoot, srcRel);
  const dest = path.resolve(destRoot, destRel);
  assertWithinRoot(srcRoot, src, srcRel);
  assertWithinRoot(destRoot, dest, destRel);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  // eslint-disable-next-line no-console
  console.log(`  → 복사: ${srcRel} → ${destRel}`);
}
