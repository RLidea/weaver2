import type { FileItem } from './api/upload.api';


export type PostStatus = 'PUBLISHED' | 'DRAFT' | 'HIDDEN';

export interface Category {
  id: string;
  name: string;
  boardId: string;
}

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
  /** 첨부(순서대로) — 글 상세·생성·수정 응답에만 있다 */
  attachments?: FileItem[];
}

/** GET /v1/boards/:boardId/posts 응답 — keyset + 고정글 포함 */
export interface BoardPostsResponse {
  data: Post[];
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
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
  /** 첨부 파일 id (순서대로) — 먼저 POST /v1/files 로 올린다 */
  attachmentFileIds?: string[];
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  status?: PostStatus;
  isPinned?: boolean;
  isSecret?: boolean;
  priority?: number;
  categoryId?: string;
  /** 보내면 첨부 목록 전체를 이것으로 바꾼다(빠진 파일은 떼어진다), 안 보내면 그대로 */
  attachmentFileIds?: string[];
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
