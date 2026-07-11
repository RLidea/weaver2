'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useResetPassword } from '../hooks/use-password-reset';
import { ResetPasswordSchema, type ResetPasswordFormValues } from '../types';
import { ApiError } from '@weaver2/api-client';
import { Button, Card, CardContent, CardFooter, CardHeader, Input } from '@weaver2/ui';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { mutate: resetPassword, isPending, error } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-center text-2xl font-semibold text-text">링크가 유효하지 않습니다</h1>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-text-muted">
            비밀번호 재설정 링크가 올바르지 않습니다.
            <br />
            다시 요청하시거나 로그인 페이지로 이동해주세요.
          </p>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:opacity-80">
            재설정 링크 다시 받기
          </Link>
          <Link href="/login" className="text-sm text-text-muted hover:opacity-80">
            로그인으로 돌아가기
          </Link>
        </CardFooter>
      </Card>
    );
  }

  function onSubmit(data: ResetPasswordFormValues) {
    if (!token) return;
    resetPassword(
      { token, password: data.password },
      { onSuccess: () => router.replace('/login?reset=1') },
    );
  }

  const serverError = error instanceof ApiError ? error.message : error?.message;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h1 className="text-center text-2xl font-semibold text-text">새 비밀번호 설정</h1>
        <p className="mt-1 text-center text-sm text-text-muted">
          새로 사용할 비밀번호를 입력해주세요.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="새 비밀번호"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="비밀번호 확인"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.confirmPassword?.message ?? serverError ?? undefined}
            {...register('confirmPassword')}
          />
          <Button type="submit" isLoading={isPending} className="mt-2 w-full">
            비밀번호 변경
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/login" className="text-sm text-text-muted hover:opacity-80">
          로그인으로 돌아가기
        </Link>
      </CardFooter>
    </Card>
  );
}
