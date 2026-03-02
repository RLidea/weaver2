'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMe } from '@/features/user/hooks/use-me';
import { useNotificationStream } from '@/features/notification/hooks/use-notification-stream';
import { Spinner } from '@/shared/components/ui/spinner';
import { AppShell } from '@/shared/components/layout/app-shell';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useMe();
  const router = useRouter();
  const pathname = usePathname();

  // 인증된 사용자에 한해 SSE 알림 스트림 연결
  useNotificationStream(isAuthenticated);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
