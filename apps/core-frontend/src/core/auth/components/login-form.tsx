'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLogin } from '@/core/auth/hooks/use-login';
import { SignInSchema, type SignInRequest } from '@/core/auth/types';
import { ApiError } from '@/types/api';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/shared/components/ui/card';
import { authApi } from '../api/auth.api';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate: login, isPending, error } = useLogin();
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignInRequest>({
    resolver: zodResolver(SignInSchema),
  });

  function onSubmit(data: SignInRequest) {
    setEmailNotVerified(false);
    const redirectPath = searchParams.get('redirect') ?? '/dashboard';
    login(data, {
      onSuccess: () => router.replace(redirectPath),
      onError: (err) => {
        if (err instanceof ApiError && err.message === 'EMAIL_NOT_VERIFIED') {
          setEmailNotVerified(true);
          setResendEmail(data.email);
        }
      },
    });
  }

  async function handleResend() {
    if (!resendEmail || resendState !== 'idle') return;
    setResendState('sending');
    try {
      await authApi.resendVerification(resendEmail);
      setResendState('sent');
    } catch {
      setResendState('idle');
    }
  }

  const serverError =
    !emailNotVerified && error instanceof ApiError
      ? error.message
      : !emailNotVerified && error
        ? error.message
        : null;

  const isRegistered = searchParams.get('registered') === '1';

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h1 className="text-center text-2xl font-semibold text-text">로그인</h1>
        {isRegistered && (
          <p className="mt-2 rounded-md bg-success/10 px-3 py-2 text-center text-sm text-success">
            가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="이메일"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="비밀번호"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message ?? serverError ?? undefined}
            {...register('password')}
          />

          {emailNotVerified && (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-3 text-sm">
              <p className="font-medium text-warning">이메일 인증이 필요합니다</p>
              <p className="mt-0.5 text-text-muted">
                가입 시 발송된 인증 메일을 확인해주세요.
              </p>
              <div className="mt-2">
                {resendState === 'sent' ? (
                  <p className="text-success text-xs">인증 메일을 재발송했습니다. 받은편지함을 확인해주세요.</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendState === 'sending'}
                    className="text-xs font-medium text-primary underline underline-offset-2 disabled:opacity-50"
                  >
                    {resendState === 'sending' ? '발송 중...' : '인증 메일 다시 받기'}
                  </button>
                )}
              </div>
            </div>
          )}

          <Button type="submit" isLoading={isPending} className="mt-2 w-full">
            로그인
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-text-muted">
          계정이 없으신가요?{' '}
          <Link href="/sign-up" className="font-medium text-primary hover:opacity-80">
            회원가입
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
