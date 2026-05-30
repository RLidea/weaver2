import { buildDependencyGraph } from './build-graph';
import type { FeatureManifest } from './feature-manifest.type';

const fixtures: FeatureManifest[] = [
  {
    id: 'board', layer: 'features', description: 'board',
    dependsOn: [{ id: 'permission', kind: 'hard' }],
    footprint: {}, removalNotes: [],
  },
  {
    id: 'abuse-report', layer: 'features', description: 'abuse-report',
    dependsOn: [{ id: 'board', kind: 'hard' }, { id: 'permission', kind: 'hard' }],
    footprint: {}, removalNotes: [],
  },
  {
    id: 'search', layer: 'features', description: 'search',
    dependsOn: [{ id: 'board', kind: 'soft' }],
    footprint: {}, removalNotes: [],
  },
];

describe('buildDependencyGraph', () => {
  it('creates one node per manifest', () => {
    const g = buildDependencyGraph(fixtures);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['abuse-report', 'board', 'search']);
  });

  it('records direct dependencies (상류)', () => {
    const g = buildDependencyGraph(fixtures);
    expect(g.dependencies['abuse-report'].sort()).toEqual(['board', 'permission']);
    expect(g.dependencies['search']).toEqual(['board']);
  });

  it('computes dependents (역의존, 하류) for board', () => {
    const g = buildDependencyGraph(fixtures);
    expect(g.dependents['board'].sort()).toEqual(['abuse-report', 'search']);
  });

  it('records edges with kind', () => {
    const g = buildDependencyGraph(fixtures);
    const e = g.edges.find((x) => x.from === 'search' && x.to === 'board');
    expect(e?.kind).toBe('soft');
  });
});
