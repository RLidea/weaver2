'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@weaver2/shared';
import { usePost } from '../hooks/use-post';
import { useUpdatePost, useDeletePost } from '../hooks/use-post-mutations';
import { usePostFiles } from '../hooks/use-post-files';
import { useMe } from '@/core/user/hooks/use-me';
import { uploadApi } from '../api/upload.api';
import { Button, Card, CardContent, ChevronLeftIcon, ConfirmDialog, Spinner, useToast } from '@weaver2/ui';
import { CommentList } from './comment-list';
import { ReactionBar } from './reaction-bar';
import { PostFiles } from './post-files';

const MAX_FILES = 10;
const MAX_SIZE_MB = 50;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

const PaperclipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

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
  const toast = useToast();
  const { data: post, isLoading } = usePost(postId);
  const { data: existingFiles = [] } = usePostFiles(postId);
  const { user } = useMe();
  const { mutate: updatePost, isPending: isUpdating } = useUpdatePost();
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setPendingDeleteIds([]);
    setNewFiles([]);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setPendingDeleteIds([]);
    setNewFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const currentCount = existingFiles.filter((f) => !pendingDeleteIds.includes(f.id)).length;
    const merged = [...newFiles, ...selected].slice(0, MAX_FILES - currentCount);
    const oversized = merged.filter((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error(`${MAX_SIZE_MB}MB 이하 파일만 첨부할 수 있습니다.`);
      return;
    }
    setNewFiles(merged);
    e.target.value = '';
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title || !content) return;

    setIsUploadingFiles(true);
    try {
      await Promise.all(pendingDeleteIds.map((id) => uploadApi.deleteFile(id)));
      if (newFiles.length > 0) {
        await uploadApi.uploadFiles(newFiles, postId);
      }
    } catch {
      toast.error('파일 처리 중 오류가 발생했습니다.');
      setIsUploadingFiles(false);
      return;
    }
    setIsUploadingFiles(false);

    updatePost(
      { postId, body: { title, content } },
      {
        onSuccess: () => {
          setIsEditing(false);
          setPendingDeleteIds([]);
          setNewFiles([]);
        },
      },
    );
  };

  const isSaving = isUpdating || isUploadingFiles;
  const remainingSlots =
    existingFiles.filter((f) => !pendingDeleteIds.includes(f.id)).length + newFiles.length;

  const handleDelete = () => setConfirmDeletePost(true);

  const handleConfirmDeletePost = () => {
    deletePost(
      { postId, boardId },
      {
        onSuccess: () => router.push(`/boards/${boardId}`),
        onSettled: () => setConfirmDeletePost(false),
      },
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

              {/* 파일 관리 섹션 */}
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs text-text-muted">첨부 파일 ({remainingSlots}/{MAX_FILES})</p>

                {/* 기존 파일 */}
                {existingFiles.map((file) => {
                  const isDeleted = pendingDeleteIds.includes(file.id);
                  return (
                    <div
                      key={file.id}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
                        isDeleted
                          ? 'border-error/30 bg-error/5 opacity-50'
                          : 'border-border bg-surface-2'
                      }`}
                    >
                      <span className={`min-w-0 flex-1 truncate text-sm ${isDeleted ? 'text-text-muted line-through' : 'text-text'}`}>
                        {file.originalName}
                      </span>
                      <span className="shrink-0 text-xs text-text-muted">{formatBytes(file.size)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingDeleteIds((prev) =>
                            isDeleted ? prev.filter((id) => id !== file.id) : [...prev, file.id],
                          )
                        }
                        className={`shrink-0 transition-colors ${isDeleted ? 'text-error hover:text-text-muted' : 'text-text-muted hover:text-error'}`}
                        aria-label={isDeleted ? '삭제 취소' : '파일 삭제'}
                      >
                        <XIcon />
                      </button>
                    </div>
                  );
                })}

                {/* 새로 추가된 파일 */}
                {newFiles.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-text">{file.name}</span>
                    <span className="shrink-0 text-xs text-text-muted">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 text-text-muted transition-colors hover:text-error"
                      aria-label="파일 제거"
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}

                {/* 파일 추가 버튼 */}
                {remainingSlots < MAX_FILES && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={isSaving}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <PaperclipIcon />
                      파일 첨부
                    </button>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={handleEditCancel} disabled={isSaving}>
                  취소
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!editTitle.trim() || !editContent.trim() || isSaving}
                  isLoading={isSaving}
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

      <ConfirmDialog
        open={confirmDeletePost}
        title="게시글 삭제"
        message="이 게시글을 삭제할까요? 되돌릴 수 없습니다."
        confirmText="삭제"
        danger
        pending={isDeleting}
        onConfirm={handleConfirmDeletePost}
        onClose={() => setConfirmDeletePost(false)}
      />
    </div>
  );
}
