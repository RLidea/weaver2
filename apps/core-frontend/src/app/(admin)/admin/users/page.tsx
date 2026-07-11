'use client';

import { Suspense } from 'react';
import { PERMISSIONS } from '@weaver2/shared';
import { Spinner } from '@weaver2/ui';
import { RequirePermission } from '@/shared/components/auth/require-permission';
import { UserTable } from '@/features/admin/users/components/user-table';

export default function AdminUsersPage() {
  return (
    <RequirePermission permission={PERMISSIONS.USER.ALL}>
      <div>
        <h1 className="text-2xl font-semibold text-text">사용자 관리</h1>
        <p className="mt-1 text-sm text-text-muted">사용자 목록을 조회하고 관리하세요.</p>
        <div className="mt-6">
          <Suspense fallback={<div className="flex justify-center py-16"><Spinner /></div>}>
            <UserTable />
          </Suspense>
        </div>
      </div>
    </RequirePermission>
  );
}
