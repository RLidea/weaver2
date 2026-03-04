import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminPostsApi } from '../api/admin-posts.api';
import type { AdminPostsParams } from '../types';

export const adminPostKeys = {
  all: ['admin', 'content', 'posts'] as const,
  lists: (params?: AdminPostsParams) => [...adminPostKeys.all, 'list', params] as const,
};

export function useAdminPosts(params?: AdminPostsParams) {
  return useQuery({
    queryKey: adminPostKeys.lists(params),
    queryFn: () => adminPostsApi.getAll(params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
