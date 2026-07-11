'use client';

import { useState } from 'react';
import Link from 'next/link';
import { hasPermission, PERMISSIONS } from '@weaver2/shared';
import { useBoard } from '../hooks/use-board';
import { useBoardPosts } from '../hooks/use-board-posts';
import { useBoardCategories } from '../hooks/use-board-categories';
import { useMe } from '@/core/user/hooks/use-me';
import { PostListItem } from './post-list-item';
import { Button, Card, ChevronLeftIcon, PencilIcon, Spinner } from '@weaver2/ui';

interface BoardDetailProps {
  boardId: string;
}

export function BoardDetail({ boardId }: BoardDetailProps) {
  const { data: board, isLoading: boardLoading } = useBoard(boardId);
  const { data: categories = [] } = useBoardCategories(boardId);
  const { user } = useMe();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const {
    data,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBoardPosts(boardId, { categoryId: selectedCategoryId });

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
  const posts = data?.pages.flatMap((page) => page.data.data) ?? [];

  const canWrite = user
    ? hasPermission(user.permissions, PERMISSIONS.POST.CREATE)
    : false;

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
        <div className="flex flex-1 items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text">{board.name}</h1>
            {board.description && (
              <p className="mt-0.5 text-sm text-text-muted">{board.description}</p>
            )}
          </div>
          {canWrite && (
            <Link href={`/boards/${boardId}/write`}>
              <Button size="sm" className="flex items-center gap-1.5">
                <PencilIcon className="h-4 w-4" />
                글쓰기
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 카테고리 필터 탭 */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategoryId(undefined)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCategoryId === undefined
                ? 'bg-primary text-primary-fg'
                : 'bg-surface-2 text-text-muted hover:bg-surface-2 hover:text-text'
            }`}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                setSelectedCategoryId(cat.id === selectedCategoryId ? undefined : cat.id)
              }
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategoryId === cat.id
                  ? 'bg-primary text-primary-fg'
                  : 'bg-surface-2 text-text-muted hover:bg-surface-2 hover:text-text'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

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
