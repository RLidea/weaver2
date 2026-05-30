import { Injectable } from '@nestjs/common';
import { buildDependencyGraph } from '@weaver2/module-registry';
import { ALL_MANIFESTS } from '../../../../features/manifests';
import type { ModuleGraphDto } from '../dto/module-graph.dto';

@Injectable()
export class AdminModulesApiService {
  getModuleGraph(): ModuleGraphDto {
    const graph = buildDependencyGraph(ALL_MANIFESTS);

    const modules = ALL_MANIFESTS.map((manifest) => ({
      id: manifest.id,
      layer: manifest.layer,
      description: manifest.description,
      dependsOn: manifest.dependsOn.map((dep) => ({
        id: dep.id,
        kind: dep.kind,
        reason: dep.reason,
      })),
      dependents: graph.dependents[manifest.id] ?? [],
      footprint: {
        backendDir: manifest.footprint.backendDir,
        prismaModels: manifest.footprint.prismaModels,
        permissions: manifest.footprint.permissions,
      },
    }));

    const hardCount = graph.edges.filter((edge) => edge.kind === 'hard').length;
    const softCount = graph.edges.filter((edge) => edge.kind === 'soft').length;

    return {
      modules,
      edges: graph.edges,
      stats: {
        moduleCount: ALL_MANIFESTS.length,
        edgeCount: graph.edges.length,
        hardCount,
        softCount,
      },
    };
  }
}
