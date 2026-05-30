import type { FeatureManifest } from './feature-manifest.type';
import type { DependencyGraph, GraphNode, GraphEdge, RemovalImpact } from './dependency-graph.type';

export function buildDependencyGraph(manifests: FeatureManifest[]): DependencyGraph {
  const nodes: GraphNode[] = manifests.map((m) => ({
    id: m.id,
    layer: m.layer,
    description: m.description,
  }));

  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();
  const dependencies: Record<string, string[]> = {};
  const dependents: Record<string, string[]> = {};

  for (const m of manifests) {
    dependencies[m.id] = [...new Set(m.dependsOn.map((d) => d.id))];
    dependents[m.id] = dependents[m.id] ?? [];
    for (const dep of m.dependsOn) {
      const edgeKey = `${m.id}->${dep.id}->${dep.kind}`;
      if (!edgeKeys.has(edgeKey)) {
        edgeKeys.add(edgeKey);
        edges.push({ from: m.id, to: dep.id, kind: dep.kind });
      }
      dependents[dep.id] = dependents[dep.id] ?? [];
      if (!dependents[dep.id].includes(m.id)) {
        dependents[dep.id].push(m.id);
      }
    }
  }

  return { nodes, edges, dependencies, dependents };
}

export function analyzeRemoval(graph: DependencyGraph, targetId: string): RemovalImpact {
  // 직·간접 하류 BFS
  const affected = new Set<string>();
  const queue = [...(graph.dependents[targetId] ?? [])];
  while (queue.length) {
    const id = queue.shift() as string;
    if (affected.has(id)) continue;
    affected.add(id);
    queue.push(...(graph.dependents[id] ?? []));
  }

  // 제거 대상 자신은 affectedDependents에서 제외
  affected.delete(targetId);

  // target을 직접 가리키는 edge를 강도별로 분류
  const incoming = graph.edges.filter((e) => e.to === targetId);
  return {
    target: targetId,
    affectedDependents: [...affected],
    hardBlockers: incoming.filter((e) => e.kind === 'hard'),
    softDegradations: incoming.filter((e) => e.kind === 'soft'),
  };
}

export function findCycles(graph: DependencyGraph): string[][] {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color: Record<string, number> = {};
  const known = new Set(graph.nodes.map((n) => n.id));
  for (const n of graph.nodes) color[n.id] = WHITE;

  const cycles: string[][] = [];
  const stack: string[] = [];

  function dfs(id: string): void {
    color[id] = GRAY;
    stack.push(id);
    for (const dep of graph.dependencies[id] ?? []) {
      if (!known.has(dep)) continue; // 노드가 아닌 의존(core 등)은 무시
      if (color[dep] === GRAY) {
        cycles.push(stack.slice(stack.indexOf(dep)));
      } else if (color[dep] === WHITE) {
        dfs(dep);
      }
    }
    stack.pop();
    color[id] = BLACK;
  }

  for (const n of graph.nodes) {
    if (color[n.id] === WHITE) dfs(n.id);
  }
  return cycles;
}

export function serializeGraph(graph: DependencyGraph): string {
  return JSON.stringify(graph, null, 2);
}
