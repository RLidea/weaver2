'use client';

import Link from 'next/link';
import { hasPermission, PERMISSIONS } from '@weaver2/shared';
import { useMe } from '@weaver2/auth';
import { useRecentNotifications } from '../hooks/use-recent-notifications';
import { BellIcon, Card, CardContent, CardHeader, ShieldIcon, Spinner, UserIcon } from '@weaver2/ui';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
}

const ACCOUNT_SHORTCUTS = [
  {
    href: '/settings/profile',
    icon: UserIcon,
    label: '프로필 편집',
    description: '이름, 아바타 변경',
  },
  {
    href: '/settings/security',
    icon: ShieldIcon,
    label: '보안 설정',
    description: '비밀번호, 이메일',
  },
  {
    href: '/settings/notifications',
    icon: BellIcon,
    label: '알림 설정',
    description: '수신 방법 관리',
  },
] as const;

export function DashboardOverview() {
  const { user } = useMe();
  const { data: recentNotifications = [], isLoading: notifLoading } = useRecentNotifications(3);

  const isAdmin = user
    ? hasPermission(user.permissions, PERMISSIONS.ADMIN.ACCESS)
    : false;

  const initials = (user?.displayName ?? user?.username ?? '?')
    .charAt(0)
    .toUpperCase();

  return (
    <div className="max-w-2xl space-y-6">
      {/* 프로필 카드 */}
      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-fg">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-text">
              {user?.displayName ?? user?.username}
            </p>
            <p className="truncate text-sm text-text-muted">@{user?.username}</p>
            {user?.email && (
              <p className="truncate text-sm text-text-muted">{user.email}</p>
            )}
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90"
            >
              관리자 패널
            </Link>
          )}
        </CardContent>
      </Card>

      {/* 최근 알림 */}
      <Card>
        <CardHeader className="flex items-center justify-between py-3">
          <h2 className="text-base font-semibold text-text">최근 알림</h2>
          <Link href="/notifications" className="text-xs text-primary hover:opacity-80">
            전체보기
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {notifLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size="sm" />
            </div>
          ) : recentNotifications.length === 0 ? (
            <p className="px-6 py-4 text-sm text-text-muted">새 알림이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentNotifications.map((notif) => (
                <li key={notif.id}>
                  {notif.link ? (
                    <Link
                      href={notif.link}
                      className="flex items-start gap-3 px-6 py-3 transition-colors hover:bg-surface-2"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notif.isRead ? 'bg-transparent' : 'bg-primary'}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">{notif.title}</p>
                        <p className="truncate text-xs text-text-muted">{notif.body}</p>
                      </div>
                      <span className="ml-2 shrink-0 text-xs text-text-muted">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 px-6 py-3">
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notif.isRead ? 'bg-transparent' : 'bg-primary'}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">{notif.title}</p>
                        <p className="truncate text-xs text-text-muted">{notif.body}</p>
                      </div>
                      <span className="ml-2 shrink-0 text-xs text-text-muted">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 계정 관리 */}
      <Card>
        <CardHeader className="py-3">
          <h2 className="text-base font-semibold text-text">계정 관리</h2>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 pb-5">
          {ACCOUNT_SHORTCUTS.map(({ href, icon: Icon, label, description }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-lg border border-border px-3 py-4 text-center transition-colors hover:bg-surface-2 hover:text-primary"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-text">{label}</p>
                <p className="text-xs text-text-muted">{description}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
