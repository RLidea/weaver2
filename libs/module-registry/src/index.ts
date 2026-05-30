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

export { resolveModuleId, KNOWN_MODULES } from './known-modules';
export type { KnownModule } from './known-modules';

export { extractManifest } from './extract-manifest';
export type { ExtractedManifest } from './extract-manifest';
