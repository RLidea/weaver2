'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/cn';

const TABS = [
  { label: '프로필 편집', href: '/settings/profile' },
  { label: '보안 설정', href: '/settings/security' },
  { label: '알림 설정', href: '/settings/notifications' },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-text">설정</h1>

      <nav className="flex gap-1 border-b border-border" aria-label="설정 메뉴">
        {TABS.map(({ label, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
