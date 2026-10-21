import { Suspense } from 'react';
import { ForgotPasswordForm, SsoOnlyNotice } from '@weaver2/auth';
import { Spinner } from '@weaver2/ui';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Suspense fallback={<Spinner size="md" />}>
        <SsoOnlyNotice title="비밀번호 찾기">
          <ForgotPasswordForm />
        </SsoOnlyNotice>
      </Suspense>
    </div>
  );
}
