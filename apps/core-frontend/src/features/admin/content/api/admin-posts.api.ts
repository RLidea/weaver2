import { apiClient } from '@/infrastructure/api-client';
import type { AdminPost, AdminPostsParams, AdminPostsResponse, PostStatus } from '../types';

function toQueryString(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export const adminPostsApi = {
  getAll: (params?: AdminPostsParams) =>
    apiClient.get<AdminPostsResponse>(`/v1/admin/content/posts${toQueryString(params ?? {})}`),

  getById: (postId: string) =>
    apiClient.get<AdminPost>(`/v1/admin/content/posts/${postId}`),

  updateStatus: (postId: string, status: PostStatus) =>
    apiClient.patch<AdminPost>(`/v1/admin/content/posts/${postId}/status`, { status }),

  delete: (postId: string) =>
    apiClient.delete<void>(`/v1/admin/content/posts/${postId}`),
};
