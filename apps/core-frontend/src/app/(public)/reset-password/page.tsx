import { Suspense } from 'react';
import { ResetPasswordForm } from '@weaver2/auth';
import { Spinner } from '@weaver2/ui';

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Suspense fallback={<Spinner size="md" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
