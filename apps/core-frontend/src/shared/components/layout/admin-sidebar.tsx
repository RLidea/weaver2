'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@weaver2/shared';
import { BoardIcon, cn, FileTextIcon, FlagIcon, HomeIcon, MailIcon, SettingsIcon, ShieldIcon, UsersIcon, XIcon } from '@weaver2/ui';
import { useMe } from '@weaver2/auth';
import { useSidebar } from './sidebar-context';

const NAV_ITEMS = [
  {
    label: '대시보드',
    href: '/admin',
    Icon: HomeIcon,
    permission: PERMISSIONS.ADMIN.ACCESS,
    exact: true,
  },
  {
    label: '사용자 관리',
    href: '/admin/users',
    Icon: UsersIcon,
    permission: PERMISSIONS.USER.READ,
    exact: false,
  },
  {
    label: '콘텐츠 관리',
    href: '/admin/content',
    Icon: BoardIcon,
    permission: PERMISSIONS.BOARD.READ,
    exact: false,
  },
  {
    label: '권한 관리',
    href: '/admin/permissions',
    Icon: ShieldIcon,
    permission: PERMISSIONS.PERMISSION_GROUP.READ,
    exact: false,
  },
  {
    label: '신고/제재',
    href: '/admin/reports',
    Icon: FlagIcon,
    permission: PERMISSIONS.REPORT.READ,
    exact: false,
  },
  {
    label: '약관 관리',
    href: '/admin/terms',
    Icon: FileTextIcon,
    permission: PERMISSIONS.TERMS.MANAGE,
    exact: false,
  },
  {
    label: '이메일 템플릿',
    href: '/admin/email-templates',
    Icon: MailIcon,
    permission: PERMISSIONS.EMAIL.TEMPLATE_MANAGE,
    exact: false,
  },
  {
    label: '시스템 설정',
    href: '/admin/settings',
    Icon: SettingsIcon,
    permission: PERMISSIONS.ADMIN.SYSTEM_SETTINGS,
    exact: false,
  },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useMe();
  const { isMobileOpen, closeMobile } = useSidebar();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const userPermissions = user?.permissions ?? [];

  const visibleItems = NAV_ITEMS.filter(({ permission }) =>
    hasPermission(userPermissions, permission),
  );

  // 서랍이 열리면 초점을 닫기 단추로 옮긴다
  useEffect(() => {
    if (isMobileOpen) closeButtonRef.current?.focus();
  }, [isMobileOpen]);

  return (
    <>
      {/* 모바일 서랍 배경 */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-text/20 md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        id="admin-sidebar"
        role={isMobileOpen ? 'dialog' : undefined}
        aria-modal={isMobileOpen || undefined}
        aria-label={isMobileOpen ? '관리자 메뉴' : undefined}
        className={cn(
          'fixed top-14 left-0 z-30 flex h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col border-r border-border bg-surface duration-200',
          // 데스크톱: 인라인 고정, 모바일: 서랍 — 닫힌 서랍은 invisible 로 탭 순서에서도 뺀다.
          // visibility 는 닫을 때만 전환에 태운다 — 열 때 곧장 보여야 초점을 옮길 수 있다
          'md:visible md:sticky md:translate-x-0',
          isMobileOpen
            ? 'translate-x-0 transition-transform'
            : 'invisible -translate-x-full transition-[transform,visibility]',
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            관리자 메뉴
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeMobile}
            className="rounded-md p-1 text-text-muted hover:bg-surface-2 md:hidden"
            aria-label="닫기"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2" aria-label="관리자 메뉴">
          {visibleItems.map(({ label, href, Icon, exact }) => {
            const isActive = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(href + '/');

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-surface-2 hover:text-text',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
