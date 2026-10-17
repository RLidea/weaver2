'use client';

import Link from 'next/link';
import { ExternalLinkIcon, MenuIcon } from '@weaver2/ui';
import { useSidebar } from './sidebar-context';
import { SkinToggle } from './skin-toggle';
import { UserMenu } from './user-menu';

export function AdminHeader() {
  const { isMobileOpen, toggleMobile, mobileTriggerRef } = useSidebar();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-surface px-4">
      {/* 모바일: 관리자 메뉴 서랍 열기 */}
      <button
        ref={mobileTriggerRef}
        type="button"
        onClick={toggleMobile}
        aria-label={isMobileOpen ? '관리자 메뉴 닫기' : '관리자 메뉴 열기'}
        aria-expanded={isMobileOpen}
        aria-controls="admin-sidebar"
        className="mr-3 rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-2 md:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {/* 관리자 로고 */}
      {/* 서랍이 열린 동안 헤더는 메뉴 단추만 살려 둔다 */}
      <div className="flex items-center gap-2" inert={isMobileOpen}>
        <span className="text-base font-bold tracking-tight text-text">Weaver</span>
        <span className="rounded-sm bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-fg">
          Admin
        </span>
      </div>

      {/* 우측 영역 */}
      <div className="ml-auto flex items-center gap-1" inert={isMobileOpen}>
        {/* 사용자 앱으로 이동 */}
        <Link
          href="/dashboard"
          aria-label="사용자 앱"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text sm:px-3"
        >
          <ExternalLinkIcon className="h-4 w-4" />
          {/* 좁은 화면에서는 아이콘만 — 헤더를 한 줄에 둔다 */}
          <span className="hidden sm:inline">사용자 앱</span>
        </Link>

        <SkinToggle />
        <UserMenu />
      </div>
    </header>
  );
}
