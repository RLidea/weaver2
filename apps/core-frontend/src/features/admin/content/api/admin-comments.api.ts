import { apiClient } from '@/infrastructure/api-client';
import type { AdminCommentsParams, AdminCommentsResponse } from '../types';

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

export const adminCommentsApi = {
  getAll: (params?: AdminCommentsParams) =>
    apiClient.get<AdminCommentsResponse>(`/v1/admin/content/comments${toQueryString(params ?? {})}`),

  delete: (commentId: string) =>
    apiClient.delete<void>(`/v1/admin/content/comments/${commentId}`),
};
