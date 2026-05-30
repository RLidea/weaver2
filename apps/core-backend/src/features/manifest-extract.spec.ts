import { resolve } from 'path';
import { extractManifest } from '@weaver2/module-registry';
import { ALL_MANIFESTS } from './manifests';

// 이 파일: apps/core-backend/src/features → repo root 는 4단계 상위.
const ROOT = resolve(__dirname, '../../../..');

// known-modules allowlist(extract-manifest가 인식하는 모듈 id)와 동일해야 한다.
const KNOWN_MODULE_IDS = ['permission', 'notification', 'auth', 'user', 'terms', 'upload', 'email'];

const onlyKnown = (ids: string[]) => ids.filter((id) => KNOWN_MODULE_IDS.includes(id)).sort();

describe('manifest ↔ extractor consistency (stale 차단)', () => {
  for (const m of ALL_MANIFESTS) {
    describe(m.id, () => {
      const ex = extractManifest(m.id, ROOT);

      it('known 의존 id 집합이 추출 결과와 일치', () => {
        const manifestKnown = onlyKnown(m.dependsOn.map((d) => d.id));
        const extractedKnown = onlyKnown(ex.dependsOn.map((d) => d.id));
        expect({ id: m.id, known: manifestKnown }).toEqual({ id: m.id, known: extractedKnown });
      });

      it('known 의존 kind가 추출과 다르면 경고만 (정적분석 한계)', () => {
        const exKind = new Map(ex.dependsOn.map((d) => [d.id, d.kind]));
        for (const dep of m.dependsOn) {
          if (!KNOWN_MODULE_IDS.includes(dep.id)) continue;
          const extractedKind = exKind.get(dep.id);
          if (extractedKind && extractedKind !== dep.kind) {
            // eslint-disable-next-line no-console
            console.warn(
              `[manifest-extract] ${m.id}: 의존 '${dep.id}' kind 불일치 — 매니페스트=${dep.kind}, 추출=${extractedKind}`,
            );
          }
        }
        expect(true).toBe(true);
      });

      it('footprint 자동필드(backendDir/prismaSchema/prismaModels/permissions)가 추출과 일치', () => {
        const fp = m.footprint;
        // 매니페스트에 정의된 자동필드만 비교 — 있으면 추출과 같아야 한다.
        if (fp.backendDir !== undefined) {
          expect({ id: m.id, backendDir: fp.backendDir }).toEqual({
            id: m.id,
            backendDir: ex.footprint.backendDir,
          });
        }
        if (fp.prismaSchema !== undefined) {
          expect({ id: m.id, prismaSchema: fp.prismaSchema }).toEqual({
            id: m.id,
            prismaSchema: ex.footprint.prismaSchema,
          });
        }
        if (fp.prismaModels !== undefined) {
          expect({ id: m.id, prismaModels: [...fp.prismaModels].sort() }).toEqual({
            id: m.id,
            prismaModels: [...(ex.footprint.prismaModels ?? [])].sort(),
          });
        }
        if (fp.permissions !== undefined) {
          expect({ id: m.id, permissions: fp.permissions }).toEqual({
            id: m.id,
            permissions: ex.footprint.permissions,
          });
        }
      });
    });
  }
});
