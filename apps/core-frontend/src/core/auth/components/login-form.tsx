'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLogin, useTwoFactorLogin, useSendLoginEmailOtp } from '@/core/auth/hooks/use-login';
import { SignInSchema, type SignInRequest, type SignInResponse } from '@/core/auth/types';
import { ApiError } from '@/types/api';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/shared/components/ui/card';
import { authApi } from '../api/auth.api';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate: login, isPending, error } = useLogin();
  const { mutate: twoFactorLogin, isPending: isTwoFactorPending, error: twoFactorError } = useTwoFactorLogin();
  const { mutate: sendEmailOtp, isPending: isSendingOtp } = useSendLoginEmailOtp();

  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [accountDeleted, setAccountDeleted] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  // 2FA 상태
  const [twoFactorState, setTwoFactorState] = useState<SignInResponse | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'totp' | 'email' | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInRequest>({
    resolver: zodResolver(SignInSchema),
  });

  const redirectPath = searchParams.get('redirect') ?? '/dashboard';

  function onSubmit(data: SignInRequest) {
    setEmailNotVerified(false);
    setAccountDeleted(false);
    login(data, {
      onSuccess: (res) => {
        const twoFactor = res?.data;
        if (twoFactor?.twoFactorRequired) {
          setTwoFactorState(twoFactor);
          // 방법이 하나뿐이면 자동 선택
          if (twoFactor.availableMethods.email && !twoFactor.availableMethods.totp) {
            setSelectedMethod('email');
            sendEmailOtp(twoFactor.preAuthToken, {
              onSuccess: () => setEmailOtpSent(true),
            });
          } else if (twoFactor.availableMethods.totp && !twoFactor.availableMethods.email) {
            setSelectedMethod('totp');
          }
          return;
        }
        router.replace(redirectPath);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.message === 'EMAIL_NOT_VERIFIED') {
          setEmailNotVerified(true);
          setResendEmail(data.email);
        } else if (err instanceof ApiError && err.message === 'ACCOUNT_DELETED') {
          setAccountDeleted(true);
        }
      },
    });
  }

  function handleSelectMethod(method: 'totp' | 'email') {
    setSelectedMethod(method);
    setOtpCode('');
    if (method === 'email' && twoFactorState && !emailOtpSent) {
      sendEmailOtp(twoFactorState.preAuthToken, {
        onSuccess: () => setEmailOtpSent(true),
      });
    }
  }

  function handleTwoFactorSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!twoFactorState || !selectedMethod || !otpCode.trim()) return;
    twoFactorLogin(
      { preAuthToken: twoFactorState.preAuthToken, method: selectedMethod, code: otpCode.trim() },
      { onSuccess: () => router.replace(redirectPath) },
    );
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
    !emailNotVerified && !accountDeleted && error instanceof ApiError
      ? error.message
      : !emailNotVerified && !accountDeleted && error
        ? error.message
        : null;

  const isRegistered = searchParams.get('registered') === '1';

  // ── 2FA 화면 ──
  if (twoFactorState) {
    const { availableMethods } = twoFactorState;
    const hasBothMethods = availableMethods.totp && availableMethods.email;

    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-center text-2xl font-semibold text-text">2단계 인증</h1>
          <p className="mt-1 text-center text-sm text-text-muted">
            계정 보안을 위해 추가 인증이 필요합니다.
          </p>
        </CardHeader>
        <CardContent>
          {hasBothMethods && !selectedMethod && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-muted">인증 방법을 선택해주세요.</p>
              <Button variant="secondary" className="w-full" onClick={() => handleSelectMethod('totp')}>
                인증 앱 (TOTP) 사용
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => handleSelectMethod('email')} isLoading={isSendingOtp}>
                이메일 인증 코드 사용
              </Button>
            </div>
          )}

          {selectedMethod && (
            <form onSubmit={handleTwoFactorSubmit} className="flex flex-col gap-4">
              {selectedMethod === 'email' && (
                <div className="rounded-md bg-surface-2 px-3 py-2 text-sm text-text-muted">
                  {emailOtpSent
                    ? '이메일로 인증 코드를 발송했습니다. 받은편지함을 확인해주세요.'
                    : '이메일 인증 코드를 발송 중입니다...'}
                </div>
              )}
              {selectedMethod === 'totp' && (
                <p className="text-sm text-text-muted">인증 앱에 표시된 6자리 코드를 입력해주세요.</p>
              )}
              <Input
                label="인증 코드"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                error={twoFactorError instanceof ApiError ? twoFactorError.message : twoFactorError?.message}
              />
              <Button type="submit" isLoading={isTwoFactorPending} className="w-full" disabled={!otpCode.trim()}>
                인증 완료
              </Button>
              {hasBothMethods && (
                <button
                  type="button"
                  onClick={() => { setSelectedMethod(null); setOtpCode(''); }}
                  className="text-xs text-text-muted underline underline-offset-2"
                >
                  다른 방법으로 인증
                </button>
              )}
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <button
            type="button"
            onClick={() => { setTwoFactorState(null); setSelectedMethod(null); setOtpCode(''); setEmailOtpSent(false); }}
            className="text-sm text-text-muted underline underline-offset-2"
          >
            로그인 화면으로 돌아가기
          </button>
        </CardFooter>
      </Card>
    );
  }

  // ── 기본 로그인 화면 ──
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

          {accountDeleted && (
            <div className="rounded-md border border-error/30 bg-error/10 px-3 py-3 text-sm">
              <p className="font-medium text-error">탈퇴한 계정입니다</p>
              <p className="mt-0.5 text-text-muted">
                이 이메일로 가입된 계정은 탈퇴 처리되었습니다. 새로 가입하시려면 회원가입을 이용해주세요.
              </p>
            </div>
          )}

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
