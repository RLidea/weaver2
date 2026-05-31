import { AdminModulesApiService } from './admin-modules.api.service';
import { ALL_MANIFESTS } from '../../../../features/manifests';

describe('AdminModulesApiService', () => {
  let service: AdminModulesApiService;

  beforeEach(() => {
    service = new AdminModulesApiService();
  });

  describe('getModuleGraph()', () => {
    it('modules 배열에 ALL_MANIFESTS의 id가 모두 포함된다', () => {
      const result = service.getModuleGraph();
      const ids = result.modules.map((m) => m.id);
      for (const manifest of ALL_MANIFESTS) {
        expect(ids).toContain(manifest.id);
      }
    });

    it('board의 dependents에 abuse-report(hard)와 search(soft)가 포함된다', () => {
      const result = service.getModuleGraph();
      const boardModule = result.modules.find((m) => m.id === 'board');
      expect(boardModule).toBeDefined();
      expect(boardModule!.dependents).toContainEqual({ id: 'abuse-report', kind: 'hard' });
      expect(boardModule!.dependents).toContainEqual({ id: 'search', kind: 'soft' });
    });

    it('abuse-report의 dependents는 비어 있다', () => {
      const result = service.getModuleGraph();
      const abuseReport = result.modules.find((m) => m.id === 'abuse-report');
      expect(abuseReport).toBeDefined();
      expect(abuseReport!.dependents).toHaveLength(0);
    });

    it('edges는 GraphEdge 구조(from/to/kind)를 갖는다', () => {
      const result = service.getModuleGraph();
      expect(result.edges.length).toBeGreaterThan(0);
      for (const edge of result.edges) {
        expect(edge).toHaveProperty('from');
        expect(edge).toHaveProperty('to');
        expect(edge).toHaveProperty('kind');
        expect(['hard', 'soft']).toContain(edge.kind);
      }
    });

    it('stats.moduleCount는 ALL_MANIFESTS 수와 같다', () => {
      const result = service.getModuleGraph();
      expect(result.stats.moduleCount).toBe(ALL_MANIFESTS.length);
    });

    it('stats.edgeCount는 edges 배열 길이와 같다', () => {
      const result = service.getModuleGraph();
      expect(result.stats.edgeCount).toBe(result.edges.length);
    });

    it('stats.hardCount + stats.softCount === stats.edgeCount', () => {
      const result = service.getModuleGraph();
      expect(result.stats.hardCount + result.stats.softCount).toBe(
        result.stats.edgeCount,
      );
    });

    it('stats.hardCount는 kind===hard 엣지 수와 같다', () => {
      const result = service.getModuleGraph();
      const hardEdges = result.edges.filter((e) => e.kind === 'hard');
      expect(result.stats.hardCount).toBe(hardEdges.length);
    });

    it('각 module은 layer, description, dependsOn, footprint 필드를 갖는다', () => {
      const result = service.getModuleGraph();
      for (const module of result.modules) {
        expect(module).toHaveProperty('id');
        expect(module).toHaveProperty('layer');
        expect(module).toHaveProperty('description');
        expect(module).toHaveProperty('dependsOn');
        expect(module).toHaveProperty('dependents');
        expect(module).toHaveProperty('footprint');
      }
    });
  });
});
