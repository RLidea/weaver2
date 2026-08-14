import { apiClient, toQueryString } from '@weaver2/api-client';
import type { AdminPost, AdminPostsParams, AdminPostsResponse, PostStatus } from '../types';

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
