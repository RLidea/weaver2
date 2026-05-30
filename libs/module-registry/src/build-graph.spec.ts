import { buildDependencyGraph, analyzeRemoval, findCycles, serializeGraph } from './build-graph';
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

describe('analyzeRemoval', () => {
  it('lists all downstream dependents of board', () => {
    const g = buildDependencyGraph(fixtures);
    const impact = analyzeRemoval(g, 'board');
    expect(impact.affectedDependents.sort()).toEqual(['abuse-report', 'search']);
  });

  it('separates hard blockers from soft degradations', () => {
    const g = buildDependencyGraph(fixtures);
    const impact = analyzeRemoval(g, 'board');
    expect(impact.hardBlockers.map((e) => e.from)).toEqual(['abuse-report']);
    expect(impact.softDegradations.map((e) => e.from)).toEqual(['search']);
  });
});

describe('findCycles', () => {
  it('returns empty for an acyclic graph', () => {
    const g = buildDependencyGraph(fixtures);
    expect(findCycles(g)).toEqual([]);
  });

  it('detects a cycle', () => {
    const cyclic: FeatureManifest[] = [
      { id: 'a', layer: 'features', description: 'a', dependsOn: [{ id: 'b', kind: 'hard' }], footprint: {}, removalNotes: [] },
      { id: 'b', layer: 'features', description: 'b', dependsOn: [{ id: 'a', kind: 'hard' }], footprint: {}, removalNotes: [] },
    ];
    const g = buildDependencyGraph(cyclic);
    expect(findCycles(g).length).toBeGreaterThan(0);
  });

  it('ignores deps not present as nodes (core modules)', () => {
    const g = buildDependencyGraph(fixtures);
    expect(findCycles(g)).toEqual([]);
  });
});

describe('buildDependencyGraph — dedupe', () => {
  it('deduplicates duplicate dependsOn entries', () => {
    const duped: FeatureManifest[] = [
      {
        id: 'a', layer: 'features', description: 'a',
        dependsOn: [
          { id: 'b', kind: 'hard' },
          { id: 'b', kind: 'hard' }, // duplicate
        ],
        footprint: {}, removalNotes: [],
      },
      {
        id: 'b', layer: 'features', description: 'b',
        dependsOn: [],
        footprint: {}, removalNotes: [],
      },
    ];
    const g = buildDependencyGraph(duped);
    expect(g.dependencies['a']).toEqual(['b']);
    expect(g.dependents['b']).toEqual(['a']);
    expect(g.edges.filter((e) => e.from === 'a' && e.to === 'b')).toHaveLength(1);
  });
});

describe('serializeGraph', () => {
  it('produces valid JSON round-trippable to the graph shape', () => {
    const g = buildDependencyGraph(fixtures);
    const json = serializeGraph(g);
    const parsed = JSON.parse(json);
    expect(parsed.nodes).toHaveLength(3);
    expect(parsed.dependents.board.sort()).toEqual(['abuse-report', 'search']);
  });
});
