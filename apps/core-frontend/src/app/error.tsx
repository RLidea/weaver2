'use client';

import { useEffect } from 'react';
import { Button } from '@weaver2/ui';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-text-muted">500</h1>
      <p className="text-lg text-text-muted">오류가 발생했습니다.</p>
      <Button variant="secondary" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
