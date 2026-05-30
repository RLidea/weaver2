import type { ModuleLayer, DependencyKind } from './feature-manifest.type';

export interface GraphNode {
  id: string;
  layer: ModuleLayer;
  description: string;
}

export interface GraphEdge {
  /** 의존하는 쪽 (하류) */
  from: string;
  /** 의존받는 쪽 (상류) */
  to: string;
  kind: DependencyKind;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** id → 직접 의존하는 상류 목록 */
  dependencies: Record<string, string[]>;
  /** id → 이 모듈에 의존하는 하류 목록 (계산됨) */
  dependents: Record<string, string[]>;
}

export interface RemovalImpact {
  target: string;
  /** 직·간접 영향받는 하류 전체 */
  affectedDependents: string[];
  /** 끊어야 하는 hard 역의존 */
  hardBlockers: GraphEdge[];
  /** 자연 비활성되는 soft 역의존 */
  softDegradations: GraphEdge[];
}
