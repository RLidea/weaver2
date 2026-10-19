import { Suspense } from 'react';
import { SignUpForm } from '@/core/sign-up/components/sign-up-form';
import { Spinner } from '@weaver2/ui';
import { SsoOnlyNotice } from '@weaver2/auth';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Suspense fallback={<Spinner size="md" />}>
        <SsoOnlyNotice title="회원가입">
          <SignUpForm />
        </SsoOnlyNotice>
      </Suspense>
    </div>
  );
}
