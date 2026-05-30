'use client';

import { PERMISSIONS } from '@weaver2/shared';
import { Spinner } from '@/shared/components/ui/spinner';
import { RequirePermission } from '@/shared/components/auth/require-permission';
import { ModuleStats } from '@/features/admin/modules/components/module-stats';
import { ModuleCard } from '@/features/admin/modules/components/module-card';
import { useModules } from '@/features/admin/modules/hooks/use-modules';

function ModuleRegistryContent() {
  const { data, isLoading, isError } = useModules();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-sm font-semibold text-text">데이터를 불러오지 못했습니다.</p>
        <p className="mt-1 text-xs text-text-muted">잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleStats stats={data.stats} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>
    </div>
  );
}

export default function AdminModulesPage() {
  return (
    <RequirePermission permission={PERMISSIONS.ADMIN.ACCESS}>
      <div>
        <h1 className="text-2xl font-semibold text-text">모듈 레지스트리</h1>
        <p className="mt-1 text-sm text-text-muted">
          시스템 모듈 구조와 의존 관계를 확인하세요.
        </p>
        <div className="mt-6">
          <ModuleRegistryContent />
        </div>
      </div>
    </RequirePermission>
  );
}
