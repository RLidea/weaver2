'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMe } from '@/core/user/hooks/use-me';
import { useLogout } from '@/core/auth/hooks/use-logout';
import { cn } from '@/shared/lib/cn';
import { ChevronDownIcon, LogOutIcon, SettingsIcon } from '@/shared/components/ui/icons';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user } = useMe();
  const { mutate: logout, isPending } = useLogout();

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Escape 키로 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const initial = user?.displayName?.[0]?.toUpperCase() ?? '?';

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-text hover:bg-surface-2 transition-colors"
      >
        {/* 아바타 */}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-fg">
          {initial}
        </span>
        <span className="hidden max-w-[100px] truncate sm:block">{user?.displayName}</span>
        <ChevronDownIcon className={cn('h-4 w-4 text-text-muted transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-surface shadow-[var(--shadow-card)]"
        >
          {/* 사용자 정보 헤더 */}
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-text truncate">{user?.displayName}</p>
            <p className="text-xs text-text-muted truncate">@{user?.username}</p>
          </div>

          {/* 메뉴 항목 */}
          <div className="p-1">
            <Link
              href="/settings/profile"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-text hover:bg-surface-2 transition-colors"
            >
              <SettingsIcon className="h-4 w-4 text-text-muted" />
              프로필 설정
            </Link>
          </div>

          <div className="border-t border-border p-1">
            <button
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              disabled={isPending}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-error hover:bg-surface-2 transition-colors disabled:opacity-50"
            >
              <LogOutIcon className="h-4 w-4" />
              {isPending ? '로그아웃 중...' : '로그아웃'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
