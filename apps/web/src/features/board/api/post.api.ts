import { apiClient } from '@/infrastructure/api-client';
import type { KeysetResponse } from '@/types/pagination';
import type {
  Post,
  BoardPostsResponse,
  Comment,
  CreatePostRequest,
  UpdatePostRequest,
  KeysetParams,
} from '../types';

function toQueryString(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export const postApi = {
  getAll: (params?: KeysetParams & { boardId?: string }) =>
    apiClient.get<BoardPostsResponse | KeysetResponse<Post>>(
      `/v1/posts${toQueryString(params ?? {})}`,
    ),

  getById: (postId: string) =>
    apiClient.get<Post>(`/v1/posts/${postId}`),

  getComments: (postId: string, params?: KeysetParams) =>
    apiClient.get<KeysetResponse<Comment>>(
      `/v1/posts/${postId}/comments${toQueryString(params ?? {})}`,
    ),

  create: (body: CreatePostRequest) =>
    apiClient.post<Post>('/v1/posts', body),

  update: (postId: string, body: UpdatePostRequest) =>
    apiClient.patch<Post>(`/v1/posts/${postId}`, body),

  delete: (postId: string) =>
    apiClient.delete<void>(`/v1/posts/${postId}`),

  getByUserId: (userId: string, params?: KeysetParams) =>
    apiClient.get<KeysetResponse<Post>>(
      `/v1/users/${userId}/posts${toQueryString(params ?? {})}`,
    ),
};
