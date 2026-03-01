'use client';

import { SidebarProvider, useSidebar } from './sidebar-context';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { cn } from '@/shared/lib/cn';

function Shell({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main
          className={cn(
            'flex-1 p-6 transition-all duration-200',
            // 데스크톱에서 사이드바 너비만큼 왼쪽 여백 확보
            isOpen ? 'md:ml-60' : 'md:ml-16',
          )}
        >
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
