'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@weaver2/api-client';
import { useClearSession } from './hooks/use-clear-session';

/**
 * ApiClient에 onAuthError 콜백을 주입하는 얇은 레이어.
 * 사용자 상태는 useMe() 훅(React Query)이 담당한다.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const clearSession = useClearSession();

  const handleAuthError = useCallback(() => {
    void clearSession().then(() => router.push('/login'));
  }, [router, clearSession]);

  useEffect(() => {
    apiClient.setOnAuthError(handleAuthError);
  }, [handleAuthError]);

  return <>{children}</>;
}
