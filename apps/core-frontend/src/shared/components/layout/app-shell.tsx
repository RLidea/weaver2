'use client';

import { SidebarProvider, useSidebar } from './sidebar-context';
import { Header } from './header';
import { Sidebar } from './sidebar';

function Shell({ children }: { children: React.ReactNode }) {
  const { isMobileOpen } = useSidebar();

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        {/* 서랍이 열린 동안 본문은 초점 · 클릭을 받지 않는다 */}
        <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6" inert={isMobileOpen}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Shell>{children}</Shell>
    </SidebarProvider>
  );
}
