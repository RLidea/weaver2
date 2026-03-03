'use client';

import Link from 'next/link';
import { hasPermission, PERMISSIONS } from '@weaver2/shared';
import { useMe } from '@/features/user/hooks/use-me';
import { useBoards } from '@/features/board/hooks/use-boards';
import { useUnreadCount } from '@/features/notification/hooks/use-unread-count';
import { useRecentPosts } from '../hooks/use-recent-posts';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { BellIcon, BoardIcon } from '@/shared/components/ui/icons';
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

export function DashboardOverview() {
  const { user } = useMe();
  const { data: boards = [], isLoading: boardsLoading } = useBoards();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: recentPosts = [], isLoading: postsLoading } = useRecentPosts(5);

  const isAdmin = user
    ? hasPermission(user.permissions, PERMISSIONS.ADMIN.ACCESS)
    : false;

  return (
    <div className="max-w-4xl space-y-6">
      {/* 환영 섹션 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            안녕하세요, {user?.displayName ?? user?.username}님!
          </h1>
          <p className="mt-1 text-sm text-text-muted">오늘도 좋은 하루 되세요.</p>
        </div>
        {isAdmin && (
          <Link
            href="/admin"
            className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90"
          >
            관리자 패널
          </Link>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Link href="/notifications" aria-label={`미읽 알림 ${unreadCount}개`}>
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-3 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <BellIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text">{unreadCount}</p>
                <p className="text-xs text-text-muted">미읽 알림</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/boards" aria-label={`게시판 ${boards.length}개`}>
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-3 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <BoardIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text">{boards.length}</p>
                <p className="text-xs text-text-muted">게시판</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 게시판 바로가기 */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-text">게시판</h2>
        </CardHeader>
        <CardContent>
          {boardsLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : boards.length === 0 ? (
            <p className="text-sm text-text-muted">게시판이 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-text transition-colors hover:bg-surface-2 hover:text-primary"
                >
                  {board.name}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 최신 게시글 */}
      <Card>
        <CardHeader className="flex items-center justify-between py-3">
          <h2 className="text-base font-semibold text-text">최신 게시글</h2>
          <Link href="/boards" className="text-xs text-primary hover:opacity-80">
            더보기
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {postsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : recentPosts.length === 0 ? (
            <p className="px-6 py-4 text-sm text-text-muted">게시글이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentPosts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/boards/${post.boardId}/posts/${post.id}`}
                    className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">{post.title}</p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {post.board.name} · 조회 {post.viewCount}
                      </p>
                    </div>
                    <span className="ml-4 shrink-0 text-xs text-text-muted">
                      {formatRelativeTime(post.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
