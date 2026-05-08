'use client';

import { Suspense } from 'react';
import { PERMISSIONS } from '@weaver2/shared';
import { Spinner } from '@/shared/components/ui/spinner';
import { RequirePermission } from '@/shared/components/auth/require-permission';
import { AdminTermsTable } from '@/features/admin/terms/components/admin-terms-table';

export default function AdminTermsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.TERMS.MANAGE}>
      <div>
        <h1 className="text-2xl font-semibold text-text">약관 관리</h1>
        <p className="mt-1 text-sm text-text-muted">서비스 이용약관을 등록하고 관리하세요.</p>
        <div className="mt-6">
          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            }
          >
            <AdminTermsTable />
          </Suspense>
        </div>
      </div>
    </RequirePermission>
  );
}
