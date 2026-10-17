'use client';

import { AdminHeader } from './admin-header';
import { AdminSidebar } from './admin-sidebar';
import { SidebarProvider, useSidebar } from './sidebar-context';

function Shell({ children }: { children: React.ReactNode }) {
  const { isMobileOpen } = useSidebar();

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <AdminHeader />
      <div className="flex flex-1">
        <AdminSidebar />
        {/* 서랍이 열린 동안 본문은 초점 · 클릭을 받지 않는다 */}
        <main className="min-w-0 flex-1 p-4 md:p-6" inert={isMobileOpen}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Shell>{children}</Shell>
    </SidebarProvider>
  );
}
