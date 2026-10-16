'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '@weaver2/api-client';
import { Button, Card, CardContent, CardFooter, CardHeader, Input } from '@weaver2/ui';
import { useVerifyEmail } from '../hooks/use-verify-email';
import { VERIFY_PASSWORD_MISMATCH, VerifyEmailSchema, type VerifyEmailFormValues } from '../types';

/**
 * 인증 링크를 누른 사람이 가입한 사람과 같은지, 가입 때 정한 비밀번호로 확인한다.
 * 남이 내 이메일로 미리 가입해 둔 경우 그 비밀번호를 모르므로 여기서 막히고,
 * 비밀번호 재설정(인증까지 끝내고 기존 세션을 끊는다)으로 계정을 되찾는다.
 */
export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const { mutate: verify, isPending, isSuccess, error } = useVerifyEmail();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(VerifyEmailSchema),
  });

  if (!token) {
    return <InvalidLink onLogin={() => router.push('/login')} />;
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-2xl">
          ✓
        </div>
        <h2 className="text-lg font-semibold text-text">이메일 인증 완료</h2>
        <p className="text-sm text-text-muted">
          이메일 인증이 완료되었습니다. 이제 로그인할 수 있어요.
        </p>
        <Button onClick={() => router.push('/login')}>로그인하러 가기</Button>
      </div>
    );
  }

  const isMismatch = error instanceof ApiError && error.message === VERIFY_PASSWORD_MISMATCH;
  // 비밀번호 불일치가 아닌 실패(토큰 없음·만료)는 링크 자체가 못 쓰게 된 것
  if (error && !isMismatch) {
    return <InvalidLink onLogin={() => router.push('/login')} />;
  }

  function onSubmit(data: VerifyEmailFormValues) {
    if (!token) return;
    verify({ token, password: data.password });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h1 className="text-center text-2xl font-semibold text-text">이메일 인증</h1>
        <p className="mt-1 text-center text-sm text-text-muted">
          가입할 때 정한 비밀번호를 입력하면 인증이 끝나요.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="비밀번호"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={
              errors.password?.message ??
              (isMismatch ? '가입할 때 정한 비밀번호와 다릅니다.' : undefined)
            }
            {...register('password')}
          />
          <Button type="submit" isLoading={isPending} className="mt-2 w-full">
            인증하기
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-center">
        <p className="text-sm text-text-muted">
          비밀번호를 모르거나 직접 가입한 적이 없다면{' '}
          <Link href="/forgot-password" className="font-medium text-primary hover:opacity-80">
            비밀번호 재설정
          </Link>
          으로 계정을 되찾을 수 있어요.
        </p>
      </CardFooter>
    </Card>
  );
}

function InvalidLink({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-2xl">
        ✗
      </div>
      <h2 className="text-lg font-semibold text-text">인증 실패</h2>
      <p className="text-sm text-text-muted">인증 링크가 유효하지 않거나 만료되었습니다.</p>
      <Button variant="secondary" onClick={onLogin}>
        로그인 페이지로 이동
      </Button>
    </div>
  );
}
