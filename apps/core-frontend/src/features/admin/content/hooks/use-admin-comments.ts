import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminCommentsApi } from '../api/admin-comments.api';
import type { AdminCommentsParams } from '../types';

export const adminCommentKeys = {
  all: ['admin', 'content', 'comments'] as const,
  lists: (params?: AdminCommentsParams) => [...adminCommentKeys.all, 'list', params] as const,
};

export function useAdminComments(params?: AdminCommentsParams) {
  return useQuery({
    queryKey: adminCommentKeys.lists(params),
    queryFn: () => adminCommentsApi.getAll(params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
