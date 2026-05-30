'use client';

import { Suspense } from 'react';
import { PERMISSIONS } from '@weaver2/shared';
import { Spinner } from '@/shared/components/ui/spinner';
import { RequirePermission } from '@/shared/components/auth/require-permission';
import { AbuseReportTable } from '@/features/admin/abuse-reports/components/abuse-report-table';

export default function AdminAbuseReportsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.ABUSE_REPORT.READ}>
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
            <AbuseReportTable />
          </Suspense>
        </div>
      </div>
    </RequirePermission>
  );
}
