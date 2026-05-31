export type DependencyKind = 'hard' | 'soft';

/** 백엔드 ModuleLayer와 동일 — 모듈이 속한 아키텍처 계층. */
export type ModuleLayer = 'core' | 'features' | 'infrastructure' | 'system';

export interface ModuleDependency {
  id: string;
  kind: DependencyKind;
  reason?: string;
}

/**
 * 역의존(이 모듈을 사용하는 하류 모듈) 항목.
 * 백엔드 변경으로 string[] → { id, kind }[] 로 확장되어
 * 역의존도 hard/soft 위험도를 구분할 수 있다.
 */
export interface ModuleDependent {
  id: string;
  kind: DependencyKind;
}

export interface ModuleFootprint {
  backendDir?: string;
  prismaModels?: string[];
  permissions?: string[];
}

export interface Module {
  id: string;
  layer: ModuleLayer;
  description: string;
  dependsOn: ModuleDependency[];
  dependents: ModuleDependent[];
  footprint: ModuleFootprint;
}

export interface ModuleEdge {
  from: string;
  to: string;
  kind: DependencyKind;
}

export interface ModuleStats {
  moduleCount: number;
  edgeCount: number;
  hardCount: number;
  softCount: number;
}

export interface ModulesResponse {
  modules: Module[];
  edges: ModuleEdge[];
  stats: ModuleStats;
}
