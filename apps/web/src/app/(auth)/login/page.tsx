'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLogin } from '@/features/auth/hooks/use-login';
import { ApiError } from '@/types/api';

function LoginForm() {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          이메일
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
      </div>
      {errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-lg bg-gray-900 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? '로그인 중...' : '로그인'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-gray-900">로그인</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
