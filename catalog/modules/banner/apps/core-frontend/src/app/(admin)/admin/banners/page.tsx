'use client';

import { PERMISSIONS } from '@weaver2/shared';
import { RequirePermission } from '@/shared/components/auth/require-permission';
import { BannerTable } from '@/features/admin/banners/components/banner-table';

export default function AdminBannersPage() {
  return (
    <RequirePermission permission={PERMISSIONS.BANNER.MANAGE}>
      <div>
        <h1 className="text-2xl font-semibold text-text">배너 관리</h1>
        <p className="mt-1 text-sm text-text-muted">
          메인/사이드/팝업 배너를 등록하고 노출을 제어합니다.
        </p>
        <div className="mt-6">
          <BannerTable />
        </div>
      </div>
    </RequirePermission>
  );
}
