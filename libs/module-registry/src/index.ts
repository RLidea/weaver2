export type {
  ModuleLayer,
  DependencyKind,
  FeatureDependency,
  FeatureFootprint,
  RemovalNote,
  FeatureManifest,
} from './feature-manifest.type';

export type {
  GraphNode,
  GraphEdge,
  DependencyGraph,
  RemovalImpact,
} from './dependency-graph.type';

export {
  buildDependencyGraph,
  analyzeRemoval,
  findCycles,
  serializeGraph,
} from './build-graph';
