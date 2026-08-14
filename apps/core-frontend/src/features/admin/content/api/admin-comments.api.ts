import { apiClient, toQueryString } from '@weaver2/api-client';
import type { AdminCommentsParams, AdminCommentsResponse } from '../types';

export const adminCommentsApi = {
  getAll: (params?: AdminCommentsParams) =>
    apiClient.get<AdminCommentsResponse>(`/v1/admin/content/comments${toQueryString(params ?? {})}`),

  delete: (commentId: string) =>
    apiClient.delete<void>(`/v1/admin/content/comments/${commentId}`),
};
