import Link from 'next/link';
import type { Post } from '../types';
import { Badge } from '@/shared/components/ui/badge';

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

interface PostListItemProps {
  post: Post;
  boardId: string;
  pinned?: boolean;
}

export function PostListItem({ post, boardId, pinned = false }: PostListItemProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
      {pinned && (
        <Badge variant="primary" size="sm" className="shrink-0">
          고정
        </Badge>
      )}
      <Link
        href={`/boards/${boardId}/posts/${post.id}`}
        className="min-w-0 flex-1 truncate text-sm font-medium text-text hover:text-primary"
      >
        {post.title}
      </Link>
      <div className="flex shrink-0 items-center gap-3 text-xs text-text-muted">
        {post.author?.username ? (
          <Link
            href={`/users/${post.author.username}`}
            className="hover:text-text"
            onClick={(e) => e.stopPropagation()}
          >
            {post.author.displayName}
          </Link>
        ) : (
          <span>알 수 없음</span>
        )}
        <span>조회 {post.viewCount}</span>
        <span>{formatRelativeTime(post.createdAt)}</span>
      </div>
    </div>
  );
}
