'use client';

import { PERMISSIONS } from '@weaver2/shared';
import { RequirePermission } from '@/shared/components/auth/require-permission';
import { ModuleDashboard } from '@/features/admin/modules/components/module-dashboard';

export default function AdminModulesPage() {
  return (
    <RequirePermission permission={PERMISSIONS.SUPER}>
      <div>
        <h1 className="text-2xl font-semibold text-text">모듈 레지스트리</h1>
        <p className="mt-1 text-sm text-text-muted">
          시스템 모듈 구조와 의존 관계를 확인하세요.
        </p>
        <div className="mt-6">
          <ModuleDashboard />
        </div>
      </div>
    </RequirePermission>
  );
}
