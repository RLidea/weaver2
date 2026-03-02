'use client';

import Link from 'next/link';
import { useUnreadCount } from '@/features/notification/hooks/use-unread-count';
import { Badge } from '@/shared/components/ui/badge';
import { BellIcon, MenuIcon } from '@/shared/components/ui/icons';
import { useSidebar } from './sidebar-context';
import { SkinToggle } from './skin-toggle';
import { UserMenu } from './user-menu';

export function Header() {
  const { toggle } = useSidebar();
  const { data: unreadCount = 0 } = useUnreadCount();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-surface px-4">
      {/* 사이드바 토글 */}
      <button
        onClick={toggle}
        aria-label="사이드바 토글"
        className="mr-3 rounded-md p-1.5 text-text-muted hover:bg-surface-2 transition-colors"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {/* 로고 */}
      <Link
        href="/dashboard"
        className="text-base font-bold tracking-tight text-text hover:text-primary transition-colors"
      >
        Weaver
      </Link>

      {/* 우측 영역 */}
      <div className="ml-auto flex items-center gap-1">
        {/* 알림 벨 */}
        <Link
          href="/notifications"
          aria-label={unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '알림'}
          className="relative rounded-md p-2 text-text-muted hover:bg-surface-2 transition-colors"
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="error"
              size="sm"
              className="absolute -right-0.5 -top-0.5"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Link>

        {/* 스킨 토글 */}
        <SkinToggle />

        {/* 유저 메뉴 */}
        <UserMenu />
      </div>
    </header>
  );
}
