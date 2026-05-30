import type { FeatureManifest } from './feature-manifest.type';
import type { DependencyGraph, GraphNode, GraphEdge } from './dependency-graph.type';

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
