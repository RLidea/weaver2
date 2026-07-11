'use client';

import { useState } from 'react';
import { Badge, Button, Input, Modal, Pagination, Spinner, useUrlState } from '@weaver2/ui';
import { useAdminComments } from '../hooks/use-admin-comments';
import { useDeleteComment } from '../hooks/use-admin-comment-mutations';
import type { AdminComment } from '../types';

const LIMIT = 20;

// ─── 삭제 확인 다이얼로그 ─────────────────────────────────────────
function CommentDeleteDialog({
  comment,
  onClose,
}: {
  comment: AdminComment | null;
  onClose: () => void;
}) {
  const { mutate, isPending } = useDeleteComment();

  if (!comment) return null;

  return (
    <Modal open={!!comment} onClose={onClose} title="댓글 삭제">
      <div className="space-y-4">
        <p className="text-sm text-text">
          아래 댓글을 삭제하시겠어요?
        </p>
        <blockquote className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-muted italic">
          &ldquo;{comment.content.length > 100 ? `${comment.content.slice(0, 100)}…` : comment.content}&rdquo;
        </blockquote>
        <p className="text-xs text-text-muted">소프트 삭제되며 콘텐츠 정리 스케줄에 따라 영구 삭제됩니다.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="danger"
            isLoading={isPending}
            onClick={() => mutate(comment.id, { onSuccess: onClose })}
          >
            삭제
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── 메인 탭 ─────────────────────────────────────────────────────
export function ContentCommentsTab() {
  const [urlState, setValues] = useUrlState(
    {
      page: { default: 1, parse: Number },
      search: { default: '' },
      includeDeleted: { default: false, parse: (r) => r === 'true' },
    },
    { resetKeys: ['page'] },
  );
  const { page, search, includeDeleted } = urlState;

  const [searchInput, setSearchInput] = useState(search);
  const [deleteComment, setDeleteComment] = useState<AdminComment | null>(null);

  const { data, isLoading, isError } = useAdminComments({
    page,
    limit: LIMIT,
    search: search || undefined,
    includeDeleted,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setValues({ search: searchInput });
  };

  const comments = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {/* 필터 영역 */}
      <div className="flex flex-wrap items-end gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="내용 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-60"
          />
          <Button type="submit" variant="secondary" size="md">
            검색
          </Button>
        </form>
        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setValues({ includeDeleted: e.target.checked })}
            className="rounded border-border"
          />
          삭제됨 포함
        </label>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg border border-border bg-surface">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}
        {isError && (
          <p className="py-16 text-center text-sm text-error">데이터를 불러오는 데 실패했습니다.</p>
        )}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="px-4 py-3 font-medium">내용</th>
                  <th className="px-4 py-3 font-medium">게시글</th>
                  <th className="px-4 py-3 font-medium">작성자</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">작성일</th>
                  <th className="px-4 py-3 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      댓글이 없습니다.
                    </td>
                  </tr>
                )}
                {comments.map((comment) => (
                  <tr key={comment.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-4 py-3 max-w-[260px]">
                      {comment.deletedAt ? (
                        <p className="truncate italic text-text-muted">[삭제된 댓글]</p>
                      ) : (
                        <a
                          href={`/boards/${comment.post.boardId}/posts/${comment.postId}#comment-${comment.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate block text-text hover:text-primary hover:underline"
                        >
                          {comment.content}
                        </a>
                      )}
                      {comment.parentId && (
                        <span className="text-xs text-text-muted">↳ 대댓글</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <a
                        href={`/boards/${comment.post.boardId}/posts/${comment.postId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate block text-text-muted hover:text-primary hover:underline"
                      >
                        {comment.post.title}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {comment.author.displayName}
                    </td>
                    <td className="px-4 py-3">
                      {comment.deletedAt ? (
                        <Badge variant="error">삭제됨</Badge>
                      ) : (
                        <Badge variant="success">정상</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(comment.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      {!comment.deletedAt && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteComment(comment)}
                          className="text-error hover:text-error"
                        >
                          삭제
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {meta && meta.totalPages > 1 && (
        <Pagination
          currentPage={meta.page}
          lastPage={meta.totalPages}
          total={meta.total}
          limit={LIMIT}
          onPageChange={(p) => setValues({ page: p })}
        />
      )}

      <CommentDeleteDialog comment={deleteComment} onClose={() => setDeleteComment(null)} />
    </div>
  );
}
