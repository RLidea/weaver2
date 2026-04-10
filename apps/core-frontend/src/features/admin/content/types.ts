// ─── Post ────────────────────────────────────────────────────────────────────

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'DELETED';

export interface AdminPost {
  id: string;
  title: string;
  content: string;
  viewCount: number;
  status: PostStatus;
  isPinned: boolean;
  isSecret: boolean;
  boardId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  board: { id: string; name: string };
  author: { id: string; username: string; displayName: string };
  _count?: { comments: number };
}

export interface AdminPostsParams {
  page?: number;
  limit?: number;
  boardId?: string;
  status?: PostStatus;
  search?: string;
  includeDeleted?: boolean;
}

export interface AdminPostsResponse {
  data: AdminPost[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Comment ─────────────────────────────────────────────────────────────────

export interface AdminComment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  post: { id: string; title: string; boardId: string };
  author: { id: string; username: string; displayName: string };
}

export interface AdminCommentsParams {
  page?: number;
  limit?: number;
  postId?: string;
  search?: string;
  includeDeleted?: boolean;
}

export interface AdminCommentsResponse {
  data: AdminComment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: '임시저장',
  PUBLISHED: '공개',
  ARCHIVED: '보관',
  DELETED: '삭제됨',
};

export const POST_STATUS_VARIANT: Record<
  PostStatus,
  'default' | 'primary' | 'warning' | 'error' | 'success'
> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  ARCHIVED: 'warning',
  DELETED: 'error',
};
