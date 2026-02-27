'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/infrastructure/api-client';

/**
 * ApiClient에 onAuthError 콜백을 주입하는 얇은 레이어.
 * 사용자 상태는 useMe() 훅(React Query)이 담당한다.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleAuthError = useCallback(() => {
    router.push('/login');
  }, [router]);

  useEffect(() => {
    apiClient.setOnAuthError(handleAuthError);
  }, [handleAuthError]);

  return <>{children}</>;
}
