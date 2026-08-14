'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@weaver2/shared';
import { useMe } from '@weaver2/auth';
import { Spinner } from '@weaver2/ui';
import { AdminShell } from '@/shared/components/layout/admin-shell';
import { SessionUnavailable } from '@/shared/components/session-unavailable';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, isUnavailable, isFetching, refetch } =
    useMe();
  const router = useRouter();

  const hasAdminAccess = user
    ? hasPermission(user.permissions, PERMISSIONS.ADMIN.ACCESS)
    : false;

  useEffect(() => {
    if (isLoading) return;
    // **서버가 답을 못 준 경우엔 아무 데도 보내지 않는다.** 세션이 끝난 게 아니므로
    // 로그인으로 보내면 쿠키가 남아 있어 되돌려지고, 화면이 빈 채로 굳는다.
    if (isUnavailable) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!hasAdminAccess) {
      router.replace('/dashboard');
    }
  }, [isLoading, isUnavailable, isAuthenticated, hasAdminAccess, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner size="md" />
      </div>
    );
  }

  if (isUnavailable) {
    return <SessionUnavailable onRetry={() => void refetch()} isRetrying={isFetching} />;
  }

  // 여기 오면 곧 위 effect 가 다른 화면으로 보낸다. **빈 화면을 그리지 않는다** —
  // 이동이 막히거나 늦어지면 사용자는 아무것도 없는 흰 화면 앞에 남겨진다.
  if (!isAuthenticated || !hasAdminAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner size="md" />
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
