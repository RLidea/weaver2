'use client';

import Link from 'next/link';
import { useNotifications } from '../hooks/use-notifications';
import { useMarkRead, useMarkAllRead } from '../hooks/use-notification-mutations';
import { Card, CardHeader, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';

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

export function NotificationList() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotifications(20);
  const { mutate: markRead } = useMarkRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllRead();

  const notifications = data?.pages.flatMap((p) => p.data.data) ?? [];
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">알림</h1>
        {hasUnread && (
          <Button
            variant="secondary"
            size="sm"
            isLoading={isMarkingAll}
            onClick={() => markAllRead()}
          >
            모두 읽음
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-text-muted">알림이 없습니다.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((notif) => {
                const inner = (
                  <>
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notif.isRead ? 'bg-transparent' : 'bg-primary'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${notif.isRead ? 'text-text-muted' : 'text-text'}`}
                      >
                        {notif.title}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">{notif.body}</p>
                    </div>
                    <span className="ml-3 shrink-0 text-xs text-text-muted">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </>
                );

                const sharedClass =
                  'flex items-start gap-3 px-6 py-4 transition-colors hover:bg-surface-2';

                return (
                  <li key={notif.id}>
                    {notif.link ? (
                      <Link
                        href={notif.link}
                        className={sharedClass}
                        onClick={() => {
                          if (!notif.isRead) markRead(notif.id);
                        }}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={`w-full text-left ${sharedClass}`}
                        onClick={() => {
                          if (!notif.isRead) markRead(notif.id);
                        }}
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>

        {hasNextPage && (
          <CardHeader className="border-t py-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              isLoading={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              더 불러오기
            </Button>
          </CardHeader>
        )}
      </Card>
    </div>
  );
}
