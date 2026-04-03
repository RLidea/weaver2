'use client';

import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { useComments } from '../hooks/use-comments';
import { CommentForm } from './comment-form';
import { Spinner } from '@/shared/components/ui/spinner';
import type { Comment } from '../types';

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

function CommentItem({
  comment,
  postId,
  depth = 0,
}: {
  comment: Comment;
  postId: string;
  depth?: number;
}) {
  const [replyOpen, setReplyOpen] = useState(false);

  return (
    <div className={cn('py-3', depth > 0 && 'ml-6 border-l-2 border-border pl-4')}>
      {comment.deletedAt ? (
        <p className="text-xs text-text-muted">삭제된 댓글입니다.</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text">
              {comment.author?.displayName ?? '알 수 없음'}
            </span>
            <span className="text-xs text-text-muted">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text">{comment.content}</p>
          {depth === 0 && (
            <button
              onClick={() => setReplyOpen((prev) => !prev)}
              className="mt-1.5 text-xs text-text-muted transition-colors hover:text-primary"
            >
              {replyOpen ? '취소' : '답글'}
            </button>
          )}
        </>
      )}

      {replyOpen && (
        <div className="mt-2">
          <CommentForm
            postId={postId}
            parentId={comment.id}
            placeholder="답글을 작성하세요."
            onSuccess={() => setReplyOpen(false)}
            onCancel={() => setReplyOpen(false)}
          />
        </div>
      )}

      {comment.children && comment.children.length > 0 && (
        <div className="mt-2 space-y-1">
          {comment.children.map((child) => (
            <CommentItem key={child.id} comment={child} postId={postId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentListProps {
  postId: string;
}

export function CommentList({ postId }: CommentListProps) {
  const { data: comments = [], isLoading } = useComments(postId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-text">댓글 {comments.length}개</h3>

      {comments.length === 0 ? (
        <p className="mb-4 text-sm text-text-muted">첫 댓글을 작성해 보세요.</p>
      ) : (
        <div className="mb-4 divide-y divide-border">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} postId={postId} />
          ))}
        </div>
      )}

      <div className="border-t border-border pt-4">
        <CommentForm postId={postId} />
      </div>
    </div>
  );
}
