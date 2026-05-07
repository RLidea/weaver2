import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/core/auth/components/forgot-password-form';
import { Spinner } from '@/shared/components/ui/spinner';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Suspense fallback={<Spinner size="md" />}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
