'use client';

import { Suspense } from 'react';
import { PERMISSIONS } from '@weaver2/shared';
import { Spinner } from '@/shared/components/ui/spinner';
import { RequirePermission } from '@/shared/components/auth/require-permission';
import { SettingsForm } from '@/features/admin/settings/components/settings-form';

export default function AdminSettingsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.ADMIN.SYSTEM_SETTINGS}>
      <div>
        <h1 className="text-2xl font-semibold text-text">시스템 설정</h1>
        <p className="mt-1 text-sm text-text-muted">사이트 전반의 동작을 제어하는 설정입니다.</p>
        <div className="mt-6">
          <Suspense
            fallback={
              <div className="flex justify-center py-24">
                <Spinner />
              </div>
            }
          >
            <SettingsForm />
          </Suspense>
        </div>
      </div>
    </RequirePermission>
  );
}
