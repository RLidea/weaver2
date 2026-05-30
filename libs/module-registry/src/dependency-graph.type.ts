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
  /**
   * `edges`와 `dependencies`/`dependents`는 `nodes`에 없는 id
   * (매니페스트가 없는 core 모듈: permission, upload, notification 등)를
   * 포함할 수 있다. `findCycles`는 `nodes` 기반의 known set으로 순회하므로
   * 비노드 의존을 무시한다(비대칭). 이 차이는 의도된 설계다.
   */
  edges: GraphEdge[];
  /** id → 직접 의존하는 상류 목록 (비노드 id 포함 가능) */
  dependencies: Record<string, string[]>;
  /** id → 이 모듈에 의존하는 하류 목록 (계산됨, 비노드 id 포함 가능) */
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
