import { Suspense } from 'react';
import { LoginForm } from '@/core/auth/components/login-form';
import { Spinner } from '@/shared/components/ui/spinner';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Suspense fallback={<Spinner size="md" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
