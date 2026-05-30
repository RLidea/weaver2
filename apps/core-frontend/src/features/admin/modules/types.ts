export type DependencyKind = 'hard' | 'soft';

export interface ModuleDependency {
  id: string;
  kind: DependencyKind;
  reason?: string;
}

export interface ModuleFootprint {
  backendDir?: string;
  prismaModels?: string[];
  permissions?: string[];
}

export interface Module {
  id: string;
  layer: string;
  description: string;
  dependsOn: ModuleDependency[];
  dependents: string[];
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
