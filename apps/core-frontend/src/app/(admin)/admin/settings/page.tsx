import { Suspense } from 'react';
import { Spinner } from '@/shared/components/ui/spinner';
import { SettingsForm } from '@/features/admin/settings/components/settings-form';

export default function AdminSettingsPage() {
  return (
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
  );
}
