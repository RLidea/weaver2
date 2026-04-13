'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@weaver2/shared';
import { usePost } from '../hooks/use-post';
import { useUpdatePost, useDeletePost } from '../hooks/use-post-mutations';
import { useMe } from '@/core/user/hooks/use-me';
import { CommentList } from './comment-list';
import { ReactionBar } from './reaction-bar';
import { PostFiles } from './post-files';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
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
  const router = useRouter();
  const { data: post, isLoading } = usePost(postId);
  const { user } = useMe();
  const { mutate: updatePost, isPending: isUpdating } = useUpdatePost();
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

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

  const perms = user?.permissions ?? [];
  const isAuthor = user?.id === post.authorId;

  const canEdit =
    (isAuthor && hasPermission(perms, PERMISSIONS.POST.UPDATE_OWN)) ||
    hasPermission(perms, PERMISSIONS.POST.UPDATE_ALL);

  const canDelete =
    (isAuthor && hasPermission(perms, PERMISSIONS.POST.DELETE_OWN)) ||
    hasPermission(perms, PERMISSIONS.POST.DELETE_ALL) ||
    hasPermission(perms, PERMISSIONS.MODERATION.CONTENT_DELETE);

  const handleEditStart = () => {
    setEditTitle(post.title);
    setEditContent(post.content);
    setIsEditing(true);
  };

  const handleEditCancel = () => setIsEditing(false);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title || !content) return;
    updatePost(
      { postId, body: { title, content } },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleDelete = () => {
    if (!confirm('게시글을 삭제할까요?')) return;
    deletePost(
      { postId, boardId },
      { onSuccess: () => router.push(`/boards/${boardId}`) },
    );
  };

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
          {isEditing ? (
            /* 수정 폼 */
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-lg font-semibold text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={8}
                className="w-full resize-none rounded-md border border-border bg-surface-2 px-3 py-2 text-sm leading-relaxed text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={handleEditCancel}>
                  취소
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!editTitle.trim() || !editContent.trim() || isUpdating}
                  isLoading={isUpdating}
                >
                  저장
                </Button>
              </div>
            </form>
          ) : (
            /* 본문 보기 */
            <>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-xl font-semibold text-text">{post.title}</h1>
                {(canEdit || canDelete) && (
                  <div className="flex shrink-0 gap-1">
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={handleEditStart}>
                        수정
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        isLoading={isDeleting}
                        className="text-error hover:bg-error/10"
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                <span>{post.author?.displayName ?? '알 수 없음'}</span>
                <span>조회 {post.viewCount}</span>
                <span>{formatDate(post.createdAt)}</span>
              </div>
              <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-text">
                {post.content}
              </div>
              <PostFiles postId={postId} />
            </>
          )}

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
