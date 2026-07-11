'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRequestPasswordReset } from '../hooks/use-password-reset';
import { ForgotPasswordSchema, type ForgotPasswordFormValues } from '../types';
import { Button, Card, CardContent, CardFooter, CardHeader, Input } from '@weaver2/ui';

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const { mutate: requestReset, isPending } = useRequestPasswordReset();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  function onSubmit(data: ForgotPasswordFormValues) {
    requestReset(data, {
      onSuccess: () => setSent(true),
    });
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-center text-2xl font-semibold text-text">메일을 확인해주세요</h1>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-text-muted">
            <span className="font-medium text-text">{getValues('email')}</span>으로
            비밀번호 재설정 링크를 발송했습니다.
          </p>
          <p className="mt-2 text-center text-sm text-text-muted">
            메일이 오지 않는다면 스팸함을 확인하거나 잠시 후 다시 시도해주세요.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/login" className="text-sm font-medium text-primary hover:opacity-80">
            로그인으로 돌아가기
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h1 className="text-center text-2xl font-semibold text-text">비밀번호 찾기</h1>
        <p className="mt-1 text-center text-sm text-text-muted">
          가입한 이메일을 입력하시면 재설정 링크를 보내드립니다.
        </p>
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
          <Button type="submit" isLoading={isPending} className="mt-2 w-full">
            재설정 링크 발송
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
