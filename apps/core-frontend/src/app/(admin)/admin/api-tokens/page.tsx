'use client';

import { Suspense } from 'react';
import { PERMISSIONS } from '@weaver2/shared';
import { Spinner } from '@weaver2/ui';
import { RequirePermission } from '@weaver2/auth';
import { ApiTokenTable } from '@/features/admin/api-tokens/components/api-token-table';

export default function AdminApiTokensPage() {
  return (
    <RequirePermission permission={PERMISSIONS.API_TOKEN.MANAGE}>
      <div>
        <h1 className="text-2xl font-semibold text-text">API 토큰</h1>
        <p className="mt-1 text-sm text-text-muted">
          정해진 경로 몇 개만 부를 수 있는 토큰을 발급하고 끊습니다. 토큰에는 주인의 권한이 따라가지 않습니다.
        </p>
        <div className="mt-6">
          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            }
          >
            <ApiTokenTable />
          </Suspense>
        </div>
      </div>
    </RequirePermission>
  );
}
