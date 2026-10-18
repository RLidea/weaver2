'use client';

import { useCallback, useEffect } from 'react';
import { apiClient } from '@weaver2/api-client';
import { useLeaveSession } from './hooks/use-leave-session';

/**
 * ApiClient에 onAuthError 콜백을 주입하는 얇은 레이어.
 * 사용자 상태는 useMe() 훅(React Query)이 담당한다.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { leave } = useLeaveSession();

  // 쿠키를 못 지웠으면 이 자리에 머문다(useLeaveSession) — 이 층에는 그릴 화면이 없다.
  // 막 실패했으면 401 이 이어져도 다시 부르지 않는다(automatic)
  const handleAuthError = useCallback(() => {
    void leave('/login', { automatic: true });
  }, [leave]);

  useEffect(() => {
    apiClient.setOnAuthError(handleAuthError);
  }, [handleAuthError]);

  return <>{children}</>;
}
