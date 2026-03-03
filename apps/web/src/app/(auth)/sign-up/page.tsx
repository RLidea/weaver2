import { Suspense } from 'react';
import { SignUpForm } from '@/features/auth/components/sign-up-form';
import { Spinner } from '@/shared/components/ui/spinner';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Suspense fallback={<Spinner size="md" />}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
