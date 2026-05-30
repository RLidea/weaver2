import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import type { Module } from '../types';

interface ModuleCardProps {
  module: Module;
}

export function ModuleCard({ module }: ModuleCardProps) {
  const { id, layer, description, dependsOn, dependents, footprint } = module;

  const prismaModelCount = footprint.prismaModels?.length ?? 0;
  const permissionCount = footprint.permissions?.length ?? 0;

  return (
    <Card glass>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-text">{id}</p>
          {description && (
            <p className="mt-0.5 text-xs text-text-muted">{description}</p>
          )}
        </div>
        <Badge variant="default" className="shrink-0">
          {layer}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 의존 목록 (→) */}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-text-muted">
            의존 (→ dependsOn)
          </p>
          {dependsOn.length === 0 ? (
            <p className="text-xs text-text-muted">없음</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {dependsOn.map((dep) => (
                <li key={dep.id} className="flex items-center gap-1">
                  <span className="text-xs text-text">{dep.id}</span>
                  <Badge
                    variant={dep.kind === 'hard' ? 'error' : 'default'}
                    size="sm"
                  >
                    {dep.kind}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 역의존 목록 (←) */}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-text-muted">
            역의존 (← dependents)
          </p>
          {dependents.length === 0 ? (
            <p className="text-xs text-text-muted">없음</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {dependents.map((dependent) => (
                <li key={dependent}>
                  <span className="text-xs text-text">{dependent}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footprint 요약 */}
        {(prismaModelCount > 0 || permissionCount > 0 || footprint.backendDir) && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-text-muted">Footprint</p>
            <div className="flex flex-wrap gap-2">
              {footprint.backendDir && (
                <span className="text-xs text-text-muted">
                  <span className="font-medium text-text">디렉토리:</span>{' '}
                  {footprint.backendDir}
                </span>
              )}
              {prismaModelCount > 0 && (
                <Badge variant="default" size="sm">
                  모델 {prismaModelCount}개
                </Badge>
              )}
              {permissionCount > 0 && (
                <Badge variant="default" size="sm">
                  권한 {permissionCount}개
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
