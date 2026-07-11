import { Suspense } from 'react';
import { SignUpForm } from '@/core/auth/components/sign-up-form';
import { Spinner } from '@weaver2/ui';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Suspense fallback={<Spinner size="md" />}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
