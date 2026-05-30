import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { buildDependencyGraph, findCycles } from '@weaver2/module-registry';
import { ALL_MANIFESTS } from './manifests';

// 모노레포 루트 (이 파일: apps/core-backend/src/features → 4단계 상위)
const ROOT = resolve(__dirname, '../../../..');
const KNOWN_CORE = ['permission', 'notification', 'upload', 'user', 'auth', 'terms'];

describe('manifest ↔ code consistency', () => {
  it('1. footprint paths exist on disk', () => {
    for (const m of ALL_MANIFESTS) {
      const paths = [
        m.footprint.backendDir,
        m.footprint.prismaSchema,
        ...(m.footprint.frontendDirs ?? []),
        ...(m.footprint.seeds ?? []),
        ...(m.footprint.routes ?? []),
      ].filter(Boolean) as string[];
      for (const p of paths) {
        expect({ id: m.id, path: p, exists: existsSync(resolve(ROOT, p)) })
          .toEqual({ id: m.id, path: p, exists: true });
      }
    }
  });

  it('2. pinpoint files exist and contain the identifier', () => {
    for (const m of ALL_MANIFESTS) {
      for (const pin of m.footprint.pinpoints ?? []) {
        const [file, ident] = pin.split('→').map((s) => s.trim());
        const full = resolve(ROOT, file);
        expect({ pin, exists: existsSync(full) }).toEqual({ pin, exists: true });
        const token = ident.split(/[\s.*]/)[0];
        expect({ pin, found: readFileSync(full, 'utf8').includes(token) })
          .toEqual({ pin, found: true });
      }
    }
  });

  it('3. every dependsOn id is another manifest or a known core module', () => {
    const ids = new Set(ALL_MANIFESTS.map((m) => m.id));
    for (const m of ALL_MANIFESTS) {
      for (const dep of m.dependsOn) {
        expect({ from: m.id, dep: dep.id, valid: ids.has(dep.id) || KNOWN_CORE.includes(dep.id) })
          .toEqual({ from: m.id, dep: dep.id, valid: true });
      }
    }
  });

  it('4. graph has no cycles', () => {
    const g = buildDependencyGraph(ALL_MANIFESTS);
    expect(findCycles(g)).toEqual([]);
  });
});
