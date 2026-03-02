'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLogin } from '@/features/auth/hooks/use-login';
import { SignInSchema, type SignInRequest } from '@/features/auth/types';
import { ApiError } from '@/types/api';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/shared/components/ui/card';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate: login, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInRequest>({
    resolver: zodResolver(SignInSchema),
  });

  function onSubmit(data: SignInRequest) {
    const redirectPath = searchParams.get('redirect') ?? '/dashboard';
    login(data, { onSuccess: () => router.replace(redirectPath) });
  }

  const serverError = error instanceof ApiError ? error.message : (error?.message ?? null);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h1 className="text-center text-2xl font-semibold text-text">로그인</h1>
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
