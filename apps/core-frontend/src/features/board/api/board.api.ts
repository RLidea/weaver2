import { apiClient } from '@weaver2/api-client';
import type { Board, BoardPostsResponse, Category, KeysetParams } from '../types';

function toQueryString(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export const boardApi = {
  getAll: () =>
    apiClient.get<Board[]>('/v1/boards'),

  getById: (id: string) =>
    apiClient.get<Board>(`/v1/boards/${id}`),

  getPosts: (boardId: string, params?: KeysetParams & { categoryId?: string }) =>
    apiClient.get<BoardPostsResponse>(
      `/v1/boards/${boardId}/posts${toQueryString(params ?? {})}`,
    ),

  getCategories: (boardId: string) =>
    apiClient.get<Category[]>(`/v1/boards/${boardId}/categories`),
};
