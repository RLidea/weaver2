import { resolve } from 'path';
import { extractManifest } from '@weaver2/module-registry';
import { ALL_MANIFESTS } from './manifests';

// 이 파일: apps/core-backend/src/features → repo root 는 4단계 상위.
const ROOT = resolve(__dirname, '../../../..');

describe('manifest ↔ extractor consistency (stale 차단)', () => {
  for (const m of ALL_MANIFESTS) {
    describe(m.id, () => {
      const ex = extractManifest(m.id, ROOT);

      it('의존 id 전체 집합이 추출 결과와 일치 (features 간 의존 포함)', () => {
        // 추출기가 core/lib 의존뿐 아니라 features 간 의존(../<feature>/)도 잡으므로
        // onlyKnown 필터 없이 전체 id 집합을 strict 비교한다.
        const manifestIds = m.dependsOn.map((d) => d.id).sort();
        const extractedIds = ex.dependsOn.map((d) => d.id).sort();
        expect({ id: m.id, ids: manifestIds }).toEqual({
          id: m.id,
          ids: extractedIds,
        });
      });

      it('의존 kind가 추출과 다르면 경고만 (정적분석 한계)', () => {
        const exKind = new Map(ex.dependsOn.map((d) => [d.id, d.kind]));
        for (const dep of m.dependsOn) {
          const extractedKind = exKind.get(dep.id);
          if (extractedKind && extractedKind !== dep.kind) {
            console.warn(
              `[manifest-extract] ${m.id}: 의존 '${dep.id}' kind 불일치 — 매니페스트=${dep.kind}, 추출=${extractedKind}`,
            );
          }
        }
        expect(true).toBe(true);
      });

      it('footprint 자동필드(backendDir/prismaSchema/prismaModels/permissions)가 추출과 양방향 일치', () => {
        const fp = m.footprint;

        // 양방향 비교: 매니페스트에 정의됐으면 추출과 같아야 하고(stale 차단),
        // 추출이 값을 산출했는데 매니페스트에 없으면 누락 stale로 에러.
        const compare = (
          field: 'backendDir' | 'prismaSchema',
          mv: string | undefined,
          ev: string | undefined,
        ) => {
          expect({ id: m.id, field, value: mv }).toEqual({
            id: m.id,
            field,
            value: ev,
          });
        };

        compare('backendDir', fp.backendDir, ex.footprint.backendDir);
        compare('prismaSchema', fp.prismaSchema, ex.footprint.prismaSchema);

        const mModels = fp.prismaModels
          ? [...fp.prismaModels].sort()
          : undefined;
        const eModels = ex.footprint.prismaModels
          ? [...ex.footprint.prismaModels].sort()
          : undefined;
        expect({ id: m.id, field: 'prismaModels', value: mModels }).toEqual({
          id: m.id,
          field: 'prismaModels',
          value: eModels,
        });

        const mPerms = fp.permissions ? [...fp.permissions].sort() : undefined;
        const ePerms = ex.footprint.permissions
          ? [...ex.footprint.permissions].sort()
          : undefined;
        expect({ id: m.id, field: 'permissions', value: mPerms }).toEqual({
          id: m.id,
          field: 'permissions',
          value: ePerms,
        });
      });
    });
  }

  describe('회귀: features 간 의존 추출 + verify 구멍 차단', () => {
    const abuse = ALL_MANIFESTS.find((m) => m.id === 'abuse-report')!;
    const ex = extractManifest('abuse-report', ROOT);

    it('abuse-report 매니페스트와 추출 모두 board 의존을 포함', () => {
      expect(abuse.dependsOn.map((d) => d.id)).toContain('board');
      expect(ex.dependsOn.map((d) => d.id)).toContain('board');
    });

    it('매니페스트에서 board 의존을 빼면 strict id-set 비교가 불일치를 감지', () => {
      // verify 구멍(onlyKnown 필터)이 막혔는지 확인하는 회귀 가드.
      const withoutBoard = abuse.dependsOn
        .filter((d) => d.id !== 'board')
        .map((d) => d.id)
        .sort();
      const extractedIds = ex.dependsOn.map((d) => d.id).sort();
      expect(withoutBoard).not.toEqual(extractedIds);
    });
  });
});
