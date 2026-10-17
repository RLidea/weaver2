import { AdminHeader } from './admin-header';
import { AdminSidebar } from './admin-sidebar';
import { SidebarProvider } from './sidebar-context';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col bg-bg">
        <AdminHeader />
        <div className="flex flex-1">
          <AdminSidebar />
          <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
