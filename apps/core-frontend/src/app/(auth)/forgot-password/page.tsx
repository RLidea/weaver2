import { Suspense } from 'react';
import { ForgotPasswordForm } from '@weaver2/auth';
import { Spinner } from '@weaver2/ui';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Suspense fallback={<Spinner size="md" />}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
