'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@weaver2/shared';
import { cn } from '@/shared/lib/cn';
import { useMe } from '@/core/user/hooks/use-me';
import {
  HomeIcon,
  UsersIcon,
  BoardIcon,
  ShieldIcon,
  FlagIcon,
  FileTextIcon,
  SettingsIcon,
  MailIcon,
  PuzzleIcon,
} from '@/shared/components/ui/icons';

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
    href: '/admin/abuse-reports',
    Icon: FlagIcon,
    permission: PERMISSIONS.ABUSE_REPORT.READ,
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
  {
    label: '모듈',
    href: '/admin/modules',
    Icon: PuzzleIcon,
    permission: PERMISSIONS.ADMIN.ACCESS,
    exact: false,
  },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useMe();
  const userPermissions = user?.permissions ?? [];

  const visibleItems = NAV_ITEMS.filter(({ permission }) =>
    hasPermission(userPermissions, permission),
  );

  return (
    <aside className="sticky top-14 flex h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          관리자 메뉴
        </p>
      </div>

      <nav className="flex flex-col gap-1 p-2" aria-label="관리자 메뉴">
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
  );
}
