'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLeaveSession, useMe } from '@weaver2/auth';
import { useNotificationStream } from '@/core/notification/hooks/use-notification-stream';
import { Spinner } from '@weaver2/ui';
import { AppShell } from '@/shared/components/layout/app-shell';
import { SessionUnavailable } from '@/shared/components/session-unavailable';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isUnavailable, isFetching, refetch } = useMe();
  const { leave, failed: leaveFailed, isLeaving } = useLeaveSession();
  const pathname = usePathname();
  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;

  // 인증된 사용자에 한해 SSE 알림 스트림 연결
  useNotificationStream(isAuthenticated);

  useEffect(() => {
    if (isLoading) return;
    // 서버가 답을 못 준 경우엔 보내지 않는다 (자세한 이유는 (admin) 레이아웃 주석 참고).
    if (isUnavailable) return;
    if (!isAuthenticated) {
      // 쿠키나 me 캐시가 남아 있으면 /dashboard 로 되돌려진다 — 지우고 보낸다 (useLeaveSession)
      void leave(loginHref);
    }
  }, [isAuthenticated, isLoading, isUnavailable, leave, loginHref]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (isUnavailable) {
    return <SessionUnavailable onRetry={() => void refetch()} isRetrying={isFetching} />;
  }

  // 세션을 내려놓지 못했다(쿠키가 남았다) — 로그인으로 보내면 되돌려지므로 여기서 다시 시도한다
  if (leaveFailed) {
    return <SessionUnavailable onRetry={() => void leave(loginHref)} isRetrying={isLeaving} />;
  }

  // 이동이 끝날 때까지의 짧은 사이. **빈 화면 대신** 스피너를 둔다.
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
