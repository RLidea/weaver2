'use client';

import Link from 'next/link';
import { usePost } from '../hooks/use-post';
import { CommentList } from './comment-list';
import { ReactionBar } from './reaction-bar';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Spinner } from '@/shared/components/ui/spinner';
import { ChevronLeftIcon } from '@/shared/components/ui/icons';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface PostDetailProps {
  boardId: string;
  postId: string;
}

export function PostDetail({ boardId, postId }: PostDetailProps) {
  const { data: post, isLoading } = usePost(postId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-text-muted">게시글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* 뒤로가기 + 게시판명 */}
      <div className="flex items-center gap-2">
        <Link
          href={`/boards/${boardId}`}
          aria-label="게시판으로"
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Link>
        <span className="text-sm text-text-muted">{post.board.name}</span>
      </div>

      {/* 게시글 본문 */}
      <Card>
        <CardContent className="py-6">
          <h1 className="text-xl font-semibold text-text">{post.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
            <span>{post.author?.displayName ?? '알 수 없음'}</span>
            <span>조회 {post.viewCount}</span>
            <span>{formatDate(post.createdAt)}</span>
          </div>
          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-text">
            {post.content}
          </div>
          <div className="mt-6 border-t border-border pt-4">
            <ReactionBar postId={postId} />
          </div>
        </CardContent>
      </Card>

      {/* 댓글 */}
      <Card>
        <CardContent className="py-5">
          <CommentList postId={postId} />
        </CardContent>
      </Card>
    </div>
  );
}
