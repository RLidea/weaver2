'use client';

import Link from 'next/link';
import { useBoard } from '../hooks/use-board';
import { useBoardPosts } from '../hooks/use-board-posts';
import { PostListItem } from './post-list-item';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';
import { ChevronLeftIcon } from '@/shared/components/ui/icons';

interface BoardDetailProps {
  boardId: string;
}

export function BoardDetail({ boardId }: BoardDetailProps) {
  const { data: board, isLoading: boardLoading } = useBoard(boardId);
  const {
    data,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBoardPosts(boardId);

  if (boardLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-text-muted">게시판을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const pinnedPosts = data?.pages[0]?.data.pinnedPosts ?? [];
  const posts = data?.pages.flatMap((page) => page.data.items) ?? [];

  return (
    <div className="max-w-4xl space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          href="/boards"
          aria-label="게시판 목록으로"
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-text">{board.name}</h1>
          {board.description && (
            <p className="mt-0.5 text-sm text-text-muted">{board.description}</p>
          )}
        </div>
      </div>

      {/* 게시글 목록 */}
      <Card>
        {/* 고정 게시글 */}
        {pinnedPosts.length > 0 && (
          <div className="border-b border-border">
            {pinnedPosts.map((post) => (
              <PostListItem key={post.id} post={post} boardId={boardId} pinned />
            ))}
          </div>
        )}

        {/* 일반 게시글 */}
        {postsLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="sm" />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-text-muted">작성된 게시글이 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {posts.map((post) => (
                <PostListItem key={post.id} post={post} boardId={boardId} />
              ))}
            </div>
            {hasNextPage && (
              <div className="border-t border-border px-4 py-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  더 보기
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
