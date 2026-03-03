import { Suspense } from 'react';
import { Spinner } from '@/shared/components/ui/spinner';
import { PermissionGroupTable } from '@/features/admin/permissions/components/permission-group-table';

export default function AdminPermissionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text">권한 관리</h1>
      <p className="mt-1 text-sm text-text-muted">
        권한 그룹을 생성하고 사용자에게 권한을 부여하세요.
      </p>
      <div className="mt-6">
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          }
        >
          <PermissionGroupTable />
        </Suspense>
      </div>
    </div>
  );
}
