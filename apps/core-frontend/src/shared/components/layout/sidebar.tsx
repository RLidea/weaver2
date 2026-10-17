'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BellIcon, cn, HomeIcon, SettingsIcon, XIcon } from '@weaver2/ui';
import { useSidebar } from './sidebar-context';

const NAV_ITEMS = [
  { label: '대시보드', href: '/dashboard', Icon: HomeIcon },
  { label: '알림', href: '/notifications', Icon: BellIcon },
  { label: '설정', href: '/settings/profile', Icon: SettingsIcon },
] as const;

export function Sidebar() {
  const { isOpen, isMobileOpen, closeMobile } = useSidebar();
  const pathname = usePathname();

  return (
    <>
      {/* 모바일 오버레이 배경 */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-text/20 md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* 사이드바 본체 */}
      <aside
        id="app-sidebar"
        className={cn(
          'fixed top-14 left-0 z-30 flex h-[calc(100vh-3.5rem)] w-60 flex-col border-r border-border bg-surface transition-all duration-200',
          // 데스크톱: 인라인(펼침/접힘), 모바일: 서랍 — 닫힌 서랍은 invisible 로 탭 순서에서도 뺀다
          'md:visible md:sticky md:translate-x-0',
          isMobileOpen ? 'translate-x-0' : 'invisible -translate-x-full',
          isOpen ? 'md:w-60' : 'md:w-16',
        )}
      >
        {/* 모바일 닫기 버튼 */}
        <div className="flex items-center justify-end border-b border-border px-3 py-2 md:hidden">
          <button
            onClick={closeMobile}
            className="rounded-md p-1.5 text-text-muted hover:bg-surface-2"
            aria-label="사이드바 닫기"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-2" aria-label="주요 메뉴">
          {NAV_ITEMS.map(({ label, href, Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-surface-2 hover:text-text',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span
                  className={cn(
                    'truncate transition-all duration-200',
                    isOpen ? 'opacity-100' : 'md:w-0 md:overflow-hidden md:opacity-0',
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
