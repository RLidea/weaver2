'use client';

import { useId, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRegister } from '@/core/auth/hooks/use-register';
import { useLatestTerms } from '@/core/terms/hooks/use-latest-terms';
import { SignUpSchema, type SignUpFormValues } from '@/core/auth/types';
import type { Terms } from '@/core/terms/types';
import { ApiError } from '@/types/api';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/shared/components/ui/card';
import { Spinner } from '@/shared/components/ui/spinner';

function TermsModal({ terms, onClose }: { terms: Terms; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg bg-surface shadow-[var(--shadow-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text">{terms.title}</h2>
            <p className="mt-0.5 text-xs text-text-muted">버전 {terms.version}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{terms.content}</p>
        </div>

        {/* 푸터 */}
        <div className="border-t border-border px-5 py-3">
          <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const checkboxId = useId();
  const { mutate: register, isPending, error } = useRegister();
  const { data: terms, isLoading: isTermsLoading } = useLatestTerms();

  const [agreedTermsIds, setAgreedTermsIds] = useState<Set<string>>(new Set());
  const [viewingTerm, setViewingTerm] = useState<Terms | null>(null);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(SignUpSchema),
  });

  function toggleTerm(id: string) {
    setAgreedTermsIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const allTermIds = terms?.map((t) => t.id) ?? [];
  const allAgreed = allTermIds.length > 0 && allTermIds.every((id) => agreedTermsIds.has(id));

  function toggleAll() {
    if (allAgreed) {
      setAgreedTermsIds(new Set());
    } else {
      setAgreedTermsIds(new Set(allTermIds));
    }
  }

  function onSubmit(data: SignUpFormValues) {
    register(
      {
        username: data.username,
        displayName: data.displayName,
        email: data.email,
        password: data.password,
        agreedTermsIds: Array.from(agreedTermsIds),
      },
      {
        onSuccess: () => {
          router.replace('/login?registered=1');
        },
      },
    );
  }

  const serverError = error instanceof ApiError ? error.message : (error?.message ?? null);

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-center text-2xl font-semibold text-text">회원가입</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="사용자명"
              type="text"
              placeholder="my_username"
              autoComplete="username"
              helperText="영소문자, 숫자, 밑줄(_)만 사용 가능"
              error={errors.username?.message}
              {...formRegister('username')}
            />
            <Input
              label="표시 이름"
              type="text"
              placeholder="홍길동"
              autoComplete="name"
              error={errors.displayName?.message}
              {...formRegister('displayName')}
            />
            <Input
              label="이메일"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...formRegister('email')}
            />
            <Input
              label="비밀번호"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              helperText="8자 이상"
              error={errors.password?.message}
              {...formRegister('password')}
            />
            <Input
              label="비밀번호 확인"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.confirmPassword?.message ?? serverError ?? undefined}
              {...formRegister('confirmPassword')}
            />

            {/* 약관 동의 */}
            {isTermsLoading ? (
              <div className="flex justify-center py-2">
                <Spinner size="sm" />
              </div>
            ) : terms && terms.length > 0 ? (
              <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                {/* 전체 동의 */}
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    id={`${checkboxId}-all`}
                    checked={allAgreed}
                    onChange={toggleAll}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium text-text">전체 약관에 동의합니다</span>
                </label>
                <hr className="border-border" />
                {terms.map((term) => (
                  <div key={term.id} className="flex items-center gap-2">
                    <label className="flex flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        id={`${checkboxId}-${term.id}`}
                        checked={agreedTermsIds.has(term.id)}
                        onChange={() => toggleTerm(term.id)}
                        className="accent-primary"
                      />
                      <span className="text-sm text-text-muted">{term.title}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setViewingTerm(term)}
                      className="shrink-0 text-xs text-primary underline-offset-2 hover:underline"
                    >
                      내용 보기
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <Button
              type="submit"
              isLoading={isPending}
              disabled={isPending || (allTermIds.length > 0 && !allAgreed)}
              className="mt-2 w-full"
            >
              가입하기
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-text-muted">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="font-medium text-primary hover:opacity-80">
              로그인
            </Link>
          </p>
        </CardFooter>
      </Card>

      {viewingTerm && <TermsModal terms={viewingTerm} onClose={() => setViewingTerm(null)} />}
    </>
  );
}
