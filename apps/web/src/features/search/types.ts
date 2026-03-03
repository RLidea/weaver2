import type { Post, Comment } from '@/features/board/types';

export type SearchType = 'posts' | 'comments' | 'all';

export interface SearchParams {
  q: string;
  type?: SearchType;
  boardId?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  posts: Post[];
  comments: Comment[];
  total: {
    posts: number;
    comments: number;
  };
}
