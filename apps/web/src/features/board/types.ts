import type { KeysetMeta } from '@/types/pagination';

export type PostStatus = 'PUBLISHED' | 'DRAFT' | 'HIDDEN';

export interface Board {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PostAuthor {
  id: string;
  username: string;
  displayName: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  viewCount: number;
  status: PostStatus;
  isPinned: boolean;
  isSecret: boolean;
  priority: number;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  boardId: string;
  authorId: string;
  board: Board;
  author?: PostAuthor;
}

/** GET /v1/boards/:boardId/posts 응답 — keyset + 고정글 포함 */
export interface BoardPostsResponse {
  items: Post[];
  meta: KeysetMeta;
  pinnedPosts: Post[];
}

export interface Comment {
  id: string;
  content: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  postId: string;
  authorId: string;
  parentId?: string | null;
  author?: PostAuthor;
  children?: Comment[];
  post?: {
    id: string;
    title: string;
    boardId: string;
  };
}

export interface Emoji {
  id: string;
  code: string;
  name: string;
  unicode: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ReactionSummary {
  emoji: Emoji;
  count: number;
  reacted: boolean;
}

export interface PostReactions {
  reactions: ReactionSummary[];
  totalCount: number;
}

// ── Request Types ────────────────────────────────────────────────────────────

export interface CreatePostRequest {
  boardId: string;
  title: string;
  content: string;
  status?: PostStatus;
  isPinned?: boolean;
  isSecret?: boolean;
  priority?: number;
  categoryId?: string;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  status?: PostStatus;
  isPinned?: boolean;
  isSecret?: boolean;
  priority?: number;
  categoryId?: string;
}

export interface CreateCommentRequest {
  postId: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

/** 페이지네이션 파라미터 (keyset 공통) */
export interface KeysetParams {
  cursor?: string;
  limit?: number;
  preset?: string;
}
