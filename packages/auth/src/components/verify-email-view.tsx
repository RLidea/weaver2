'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authApi } from '../api/auth.api';
import { Button, Spinner } from '@weaver2/ui';

type Status = 'loading' | 'success' | 'error';

export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  // 토큰 없음은 렌더 시점에 알 수 있으므로 초기 상태로 처리 (effect 내 동기 setState 회피)
  const [status, setStatus] = useState<Status>(() => (token ? 'loading' : 'error'));

  useEffect(() => {
    if (!token) return;

    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Spinner size="md" />
        <p className="text-sm text-text-muted">이메일 인증 중...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-2xl">
          ✓
        </div>
        <h2 className="text-lg font-semibold text-text">이메일 인증 완료</h2>
        <p className="text-sm text-text-muted">이메일 인증이 완료되었습니다. 이제 로그인할 수 있어요.</p>
        <Button onClick={() => router.push('/login')}>로그인하러 가기</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-2xl">
        ✗
      </div>
      <h2 className="text-lg font-semibold text-text">인증 실패</h2>
      <p className="text-sm text-text-muted">
        인증 링크가 유효하지 않거나 만료되었습니다.
      </p>
      <Button variant="secondary" onClick={() => router.push('/login')}>
        로그인 페이지로 이동
      </Button>
    </div>
  );
}
