import { Suspense } from 'react';
import { ResetPasswordForm } from '@/core/auth/components/reset-password-form';
import { Spinner } from '@/shared/components/ui/spinner';

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Suspense fallback={<Spinner size="md" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
