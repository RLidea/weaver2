'use client';

import { useState } from 'react';
import { Button, cn, ConfirmDialog, Spinner } from '@weaver2/ui';
import { hasPermission, PERMISSIONS } from '@weaver2/shared';
import { useComments } from '../hooks/use-comments';
import { useUpdateComment, useDeleteComment } from '../hooks/use-comment-mutations';
import { useMe } from '@weaver2/auth';
import { CommentForm } from './comment-form';
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

interface CommentItemProps {
  comment: Comment;
  postId: string;
  depth?: number;
  userId: string | null;
  userPermissions: string[];
}

function CommentItem({ comment, postId, depth = 0, userId, userPermissions }: CommentItemProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { mutate: updateComment, isPending: isUpdating } = useUpdateComment();
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment();

  const isAuthor = userId === comment.authorId;
  const canEdit =
    (isAuthor && hasPermission(userPermissions, PERMISSIONS.COMMENT.UPDATE_OWN)) ||
    hasPermission(userPermissions, PERMISSIONS.COMMENT.UPDATE_ALL);
  const canDelete =
    (isAuthor && hasPermission(userPermissions, PERMISSIONS.COMMENT.DELETE_OWN)) ||
    hasPermission(userPermissions, PERMISSIONS.COMMENT.DELETE_ALL) ||
    hasPermission(userPermissions, PERMISSIONS.MODERATION.CONTENT_DELETE);

  const handleEditStart = () => {
    setEditContent(comment.content ?? '');
    setIsEditing(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = editContent.trim();
    if (!content) return;
    updateComment(
      { commentId: comment.id, body: { content } },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleDelete = () => setConfirmDelete(true);

  const handleConfirmDelete = () => {
    deleteComment(
      { commentId: comment.id, postId },
      { onSettled: () => setConfirmDelete(false) },
    );
  };

  return (
    <div id={`comment-${comment.id}`} className={cn('py-3', depth > 0 && 'ml-6 border-l-2 border-border pl-4')}>
      {comment.deletedAt ? (
        <p className="text-xs text-text-muted">삭제된 댓글입니다.</p>
      ) : isEditing ? (
        /* 수정 폼 */
        <form onSubmit={handleEditSubmit} className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              취소
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!editContent.trim() || isUpdating}
              isLoading={isUpdating}
            >
              저장
            </Button>
          </div>
        </form>
      ) : (
        /* 댓글 보기 */
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text">
              {comment.author?.displayName ?? '알 수 없음'}
            </span>
            <span className="text-xs text-text-muted">{formatRelativeTime(comment.createdAt)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text">{comment.content}</p>
          <div className="mt-1.5 flex items-center gap-2">
            {depth === 0 && (
              <button
                onClick={() => setReplyOpen((prev) => !prev)}
                className="text-xs text-text-muted transition-colors hover:text-primary"
              >
                {replyOpen ? '취소' : '답글'}
              </button>
            )}
            {canEdit && (
              <button
                onClick={handleEditStart}
                className="text-xs text-text-muted transition-colors hover:text-text"
              >
                수정
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs text-text-muted transition-colors hover:text-error"
              >
                삭제
              </button>
            )}
          </div>
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
            <CommentItem
              key={child.id}
              comment={child}
              postId={postId}
              depth={depth + 1}
              userId={userId}
              userPermissions={userPermissions}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="댓글 삭제"
        message="이 댓글을 삭제할까요? 되돌릴 수 없습니다."
        confirmText="삭제"
        danger
        pending={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

interface CommentListProps {
  postId: string;
}

export function CommentList({ postId }: CommentListProps) {
  const { data: comments = [], isLoading } = useComments(postId);
  const { user } = useMe();

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
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              userId={user?.id ?? null}
              userPermissions={user?.permissions ?? []}
            />
          ))}
        </div>
      )}

      <div className="border-t border-border pt-4">
        <CommentForm postId={postId} />
      </div>
    </div>
  );
}
