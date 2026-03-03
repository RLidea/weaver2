'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@weaver2/shared';
import { useMe } from '@/features/user/hooks/use-me';
import { Spinner } from '@/shared/components/ui/spinner';
import { AdminShell } from '@/shared/components/layout/admin-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useMe();
  const router = useRouter();

  const hasAdminAccess = user
    ? hasPermission(user.permissions, PERMISSIONS.ADMIN.ACCESS)
    : false;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!hasAdminAccess) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, hasAdminAccess, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner size="md" />
      </div>
    );
  }

  if (!isAuthenticated || !hasAdminAccess) {
    return null;
  }

  return <AdminShell>{children}</AdminShell>;
}
