'use client';

import Link from 'next/link';
import { SearchHighlight } from './search-highlight';
import { Spinner } from '@/shared/components/ui/spinner';
import type { SearchResult, SearchType } from '../types';
import type { Post, Comment } from '@/features/board/types';

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

function excerpt(text: string, query: string, maxLen = 120): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen);
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, start + maxLen);
  return (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
}

function PostItem({ post, query }: { post: Post; query: string }) {
  return (
    <Link
      href={`/boards/${post.boardId}/posts/${post.id}`}
      className="block space-y-1 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-text">
          <SearchHighlight text={post.title} query={query} />
        </p>
        <span className="shrink-0 text-xs text-text-muted">
          {formatRelativeTime(post.createdAt)}
        </span>
      </div>
      <p className="text-sm text-text-muted">
        <SearchHighlight text={excerpt(post.content, query)} query={query} />
      </p>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span>{post.board?.name}</span>
        <span>·</span>
        <span>{post.author?.displayName ?? '알 수 없음'}</span>
        <span>·</span>
        <span>조회 {post.viewCount}</span>
      </div>
    </Link>
  );
}

function CommentItem({ comment, query }: { comment: Comment; query: string }) {
  if (!comment.post) return null;

  return (
    <Link
      href={`/boards/${comment.post.boardId}/posts/${comment.post.id}#comment-${comment.id}`}
      className="block space-y-1 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-text-muted">
          댓글 in{' '}
          <span className="text-text">{comment.post.title}</span>
        </p>
        <span className="shrink-0 text-xs text-text-muted">
          {formatRelativeTime(comment.createdAt)}
        </span>
      </div>
      <p className="text-sm text-text">
        <SearchHighlight
          text={excerpt(comment.content ?? '', query)}
          query={query}
        />
      </p>
      <p className="text-xs text-text-muted">
        {comment.author?.displayName ?? '알 수 없음'}
      </p>
    </Link>
  );
}

interface SearchResultsProps {
  data: SearchResult | undefined;
  query: string;
  type: SearchType;
  isLoading: boolean;
}

export function SearchResults({ data, query, type, isLoading }: SearchResultsProps) {
  if (!query.trim()) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-text-muted">검색어를 입력해주세요.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  const posts = data?.posts ?? [];
  const comments = data?.comments ?? [];
  const totalPosts = data?.total.posts ?? 0;
  const totalComments = data?.total.comments ?? 0;

  const isEmpty =
    (type === 'all' && posts.length === 0 && comments.length === 0) ||
    (type === 'posts' && posts.length === 0) ||
    (type === 'comments' && comments.length === 0);

  if (isEmpty) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-text-muted">
          &ldquo;{query}&rdquo;에 대한 검색 결과가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 게시글 결과 */}
      {(type === 'all' || type === 'posts') && posts.length > 0 && (
        <section>
          <p className="mb-3 text-sm font-semibold text-text">
            게시글{' '}
            <span className="font-normal text-text-muted">{totalPosts}건</span>
          </p>
          <div className="space-y-2">
            {posts.map((post) => (
              <PostItem key={post.id} post={post} query={query} />
            ))}
          </div>
        </section>
      )}

      {/* 댓글 결과 */}
      {(type === 'all' || type === 'comments') && comments.length > 0 && (
        <section>
          <p className="mb-3 text-sm font-semibold text-text">
            댓글{' '}
            <span className="font-normal text-text-muted">{totalComments}건</span>
          </p>
          <div className="space-y-2">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} query={query} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
