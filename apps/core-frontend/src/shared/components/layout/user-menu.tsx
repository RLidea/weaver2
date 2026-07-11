'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLogout, useMe } from '@weaver2/auth';
import { BellIcon, ChevronDownIcon, cn, FlagIcon, HomeIcon, LogOutIcon, SettingsIcon, ShieldIcon, UserIcon } from '@weaver2/ui';
import { hasPermission, PERMISSIONS } from '@weaver2/shared';

function MenuItem({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-text hover:bg-surface-2 transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user } = useMe();
  const { mutate: logout, isPending } = useLogout();

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const permissions = user?.permissions ?? [];
  const hasAdminAccess = hasPermission(permissions, PERMISSIONS.ADMIN.ACCESS);
  const hasReportAccess =
    !hasAdminAccess && hasPermission(permissions, PERMISSIONS.REPORT.READ);

  const initial = user?.displayName?.[0]?.toUpperCase() ?? '?';
  const close = () => setIsOpen(false);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-text hover:bg-surface-2 transition-colors"
      >
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
            <p className="truncate text-sm font-semibold text-text">{user?.displayName}</p>
            <p className="truncate text-xs text-text-muted">@{user?.username}</p>
          </div>

          {/* 일반 메뉴 */}
          <div className="p-1">
            <MenuItem href="/dashboard" icon={<HomeIcon className="h-4 w-4 text-text-muted" />} onClick={close}>
              대시보드
            </MenuItem>
            <MenuItem href="/settings/profile" icon={<UserIcon className="h-4 w-4 text-text-muted" />} onClick={close}>
              프로필 설정
            </MenuItem>
            <MenuItem href="/settings/security" icon={<ShieldIcon className="h-4 w-4 text-text-muted" />} onClick={close}>
              보안 설정
            </MenuItem>
            <MenuItem href="/settings/notifications" icon={<BellIcon className="h-4 w-4 text-text-muted" />} onClick={close}>
              알림 설정
            </MenuItem>
          </div>

          {/* 관리자 패널 — admin:access */}
          {hasAdminAccess && (
            <div className="border-t border-border p-1">
              <MenuItem href="/admin" icon={<SettingsIcon className="h-4 w-4 text-text-muted" />} onClick={close}>
                관리자 패널
              </MenuItem>
            </div>
          )}

          {/* 신고 관리 — report:read (관리자 제외) */}
          {hasReportAccess && (
            <div className="border-t border-border p-1">
              <MenuItem href="/admin/reports" icon={<FlagIcon className="h-4 w-4 text-text-muted" />} onClick={close}>
                신고 관리
              </MenuItem>
            </div>
          )}

          {/* 로그아웃 */}
          <div className="border-t border-border p-1">
            <button
              role="menuitem"
              onClick={() => { close(); logout(); }}
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
