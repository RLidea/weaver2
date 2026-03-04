'use client';

import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Spinner } from '@/shared/components/ui/spinner';
import { Modal } from '@/shared/components/ui/modal';
import { Select } from '@/shared/components/ui/select';
import { useAdminBoards } from '@/features/admin/boards/hooks/use-admin-boards';
import { useAdminPosts } from '../hooks/use-admin-posts';
import { useUpdatePostStatus, useDeletePost } from '../hooks/use-admin-post-mutations';
import {
  POST_STATUS_LABELS,
  POST_STATUS_VARIANT,
  type AdminPost,
  type PostStatus,
} from '../types';

const LIMIT = 20;

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'PUBLISHED', label: '공개' },
  { value: 'DRAFT', label: '임시저장' },
  { value: 'ARCHIVED', label: '보관' },
  { value: 'DELETED', label: '삭제됨' },
];

// ─── 상태 변경 모달 ───────────────────────────────────────────────
function PostStatusModal({
  post,
  onClose,
}: {
  post: AdminPost | null;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<PostStatus>(post?.status ?? 'PUBLISHED');
  const { mutate, isPending } = useUpdatePostStatus();

  if (!post) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ postId: post.id, status }, { onSuccess: onClose });
  };

  return (
    <Modal open={!!post} onClose={onClose} title="게시글 상태 변경">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-muted truncate">
          <span className="font-medium text-text">{post.title}</span>
        </p>
        <Select
          label="변경할 상태"
          id="post-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as PostStatus)}
          options={[
            { value: 'PUBLISHED', label: '공개' },
            { value: 'ARCHIVED', label: '보관 (숨김)' },
            { value: 'DRAFT', label: '임시저장' },
          ]}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" isLoading={isPending}>
            변경
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── 삭제 확인 다이얼로그 ─────────────────────────────────────────
function PostDeleteDialog({
  post,
  onClose,
}: {
  post: AdminPost | null;
  onClose: () => void;
}) {
  const { mutate, isPending } = useDeletePost();

  if (!post) return null;

  return (
    <Modal open={!!post} onClose={onClose} title="게시글 삭제">
      <div className="space-y-4">
        <p className="text-sm text-text">
          <span className="font-medium">&ldquo;{post.title}&rdquo;</span> 게시글을 삭제하시겠어요?
        </p>
        <p className="text-xs text-text-muted">소프트 삭제되며 콘텐츠 정리 스케줄에 따라 영구 삭제됩니다.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="danger"
            isLoading={isPending}
            onClick={() => mutate(post.id, { onSuccess: onClose })}
          >
            삭제
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── 메인 탭 ─────────────────────────────────────────────────────
export function ContentPostsTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const boardId = searchParams.get('boardId') ?? '';
  const status = (searchParams.get('status') ?? '') as PostStatus | '';
  const search = searchParams.get('search') ?? '';
  const includeDeleted = searchParams.get('includeDeleted') === 'true';

  const [searchInput, setSearchInput] = useState(search);
  const [statusPost, setStatusPost] = useState<AdminPost | null>(null);
  const [deletePost, setDeletePost] = useState<AdminPost | null>(null);

  const { data: boards } = useAdminBoards();
  const { data, isLoading, isError } = useAdminPosts({
    page,
    limit: LIMIT,
    boardId: boardId || undefined,
    status: (status as PostStatus) || undefined,
    search: search || undefined,
    includeDeleted,
  });

  const setParam = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // 필터 변경 시 페이지 초기화
    if (!('page' in updates)) next.set('page', '1');
    router.push(`${pathname}?${next.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParam({ search: searchInput || undefined });
  };

  const posts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {/* 필터 영역 */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Select
            label=""
            id="board-filter"
            value={boardId}
            onChange={(e) => setParam({ boardId: e.target.value || undefined })}
            options={[
              { value: '', label: '전체 게시판' },
              ...(boards ?? []).map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        </div>
        <div className="w-36">
          <Select
            label=""
            id="status-filter"
            value={status}
            onChange={(e) => setParam({ status: e.target.value || undefined })}
            options={STATUS_OPTIONS}
          />
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="제목 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-52"
          />
          <Button type="submit" variant="secondary" size="md">
            검색
          </Button>
        </form>
        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) =>
              setParam({ includeDeleted: e.target.checked ? 'true' : undefined })
            }
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
                  <th className="px-4 py-3 font-medium">제목</th>
                  <th className="px-4 py-3 font-medium">게시판</th>
                  <th className="px-4 py-3 font-medium">작성자</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium text-right">조회 / 댓글</th>
                  <th className="px-4 py-3 font-medium">작성일</th>
                  <th className="px-4 py-3 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      게시글이 없습니다.
                    </td>
                  </tr>
                )}
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    className="transition-colors hover:bg-surface-2"
                  >
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="truncate font-medium text-text">{post.title}</p>
                      {post.isPinned && (
                        <span className="text-xs text-primary">📌 고정</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{post.board.name}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {post.author.displayName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={POST_STATUS_VARIANT[post.status]}>
                        {POST_STATUS_LABELS[post.status]}
                      </Badge>
                      {post.deletedAt && (
                        <span className="ml-1 text-xs text-error">삭제됨</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted">
                      {post.viewCount.toLocaleString()} /{' '}
                      {(post._count?.comments ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {!post.deletedAt && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setStatusPost(post)}
                          >
                            상태변경
                          </Button>
                        )}
                        {!post.deletedAt && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletePost(post)}
                            className="text-error hover:text-error"
                          >
                            삭제
                          </Button>
                        )}
                      </div>
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
        <div className="flex items-center justify-between text-sm text-text-muted">
          <p>
            전체 {meta.total.toLocaleString()}건 / {meta.page} / {meta.totalPages} 페이지
          </p>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              disabled={meta.page <= 1}
              onClick={() => setParam({ page: String(meta.page - 1) })}
            >
              이전
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setParam({ page: String(meta.page + 1) })}
            >
              다음
            </Button>
          </div>
        </div>
      )}

      <PostStatusModal post={statusPost} onClose={() => setStatusPost(null)} />
      <PostDeleteDialog post={deletePost} onClose={() => setDeletePost(null)} />
    </div>
  );
}
