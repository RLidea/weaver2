'use client';

import { Suspense } from 'react';
import { PERMISSIONS } from '@weaver2/shared';
import { Spinner } from '@/shared/components/ui/spinner';
import { RequirePermission } from '@/shared/components/auth/require-permission';
import { ReportTable } from '@/features/admin/reports/components/report-table';

export default function AdminReportsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT.READ}>
      <div>
        <h1 className="text-2xl font-semibold text-text">신고/제재</h1>
        <p className="mt-1 text-sm text-text-muted">사용자 신고 내역을 검토하고 처리하세요.</p>
        <div className="mt-6">
          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            }
          >
            <ReportTable />
          </Suspense>
        </div>
      </div>
    </RequirePermission>
  );
}
