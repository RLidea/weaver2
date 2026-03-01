'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLogin } from '@/features/auth/hooks/use-login';
import { ApiError } from '@/types/api';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/shared/components/ui/card';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate: login, isPending, error } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const redirectPath = searchParams.get('redirect') ?? '/dashboard';
    login(
      { email, password },
      { onSuccess: () => router.replace(redirectPath) },
    );
  }

  const errorMessage = error instanceof ApiError ? error.message : (error?.message ?? null);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h1 className="text-center text-2xl font-semibold text-text">로그인</h1>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="이메일"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <Input
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            error={errorMessage ?? undefined}
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
