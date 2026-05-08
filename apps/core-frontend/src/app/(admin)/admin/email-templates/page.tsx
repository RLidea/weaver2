'use client';

import { Suspense } from 'react';
import { PERMISSIONS } from '@weaver2/shared';
import { Spinner } from '@/shared/components/ui/spinner';
import { RequirePermission } from '@/shared/components/auth/require-permission';
import { EmailTemplateList } from '@/features/admin/email-templates/components/email-template-list';

export default function AdminEmailTemplatesPage() {
  return (
    <RequirePermission permission={PERMISSIONS.EMAIL.TEMPLATE_MANAGE}>
      <div>
        <h1 className="text-2xl font-semibold text-text">이메일 템플릿</h1>
        <p className="mt-1 text-sm text-text-muted">
          시스템에서 발송하는 이메일 템플릿을 관리합니다. 제목과 본문을 수정할 수 있습니다.
        </p>
        <div className="mt-6">
          <Suspense fallback={<div className="flex justify-center py-24"><Spinner /></div>}>
            <EmailTemplateList />
          </Suspense>
        </div>
      </div>
    </RequirePermission>
  );
}
