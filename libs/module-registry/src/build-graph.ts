import type { FeatureManifest } from './feature-manifest.type';
import type { DependencyGraph, GraphNode, GraphEdge, RemovalImpact } from './dependency-graph.type';

export function buildDependencyGraph(manifests: FeatureManifest[]): DependencyGraph {
  const nodes: GraphNode[] = manifests.map((m) => ({
    id: m.id,
    layer: m.layer,
    description: m.description,
  }));

  const edges: GraphEdge[] = [];
  const dependencies: Record<string, string[]> = {};
  const dependents: Record<string, string[]> = {};

  for (const m of manifests) {
    dependencies[m.id] = m.dependsOn.map((d) => d.id);
    dependents[m.id] = dependents[m.id] ?? [];
    for (const dep of m.dependsOn) {
      edges.push({ from: m.id, to: dep.id, kind: dep.kind });
      dependents[dep.id] = dependents[dep.id] ?? [];
      dependents[dep.id].push(m.id);
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

  // target을 직접 가리키는 edge를 강도별로 분류
  const incoming = graph.edges.filter((e) => e.to === targetId);
  return {
    target: targetId,
    affectedDependents: [...affected],
    hardBlockers: incoming.filter((e) => e.kind === 'hard'),
    softDegradations: incoming.filter((e) => e.kind === 'soft'),
  };
}
