import { apiClient } from '@/infrastructure/api-client';
import type { Board, BoardPostsResponse, KeysetParams } from '../types';

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

  getPosts: (boardId: string, params?: KeysetParams) =>
    apiClient.get<BoardPostsResponse>(
      `/v1/boards/${boardId}/posts${toQueryString(params ?? {})}`,
    ),
};
