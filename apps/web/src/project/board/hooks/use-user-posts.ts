import { useInfiniteQuery } from '@tanstack/react-query';
import { postApi } from '../api/post.api';
import { postKeys } from '../query-keys';
import type { KeysetParams } from '../types';

export function useUserPosts(userId: string, params?: Omit<KeysetParams, 'cursor'>) {
  return useInfiniteQuery({
    queryKey: postKeys.byUser(userId),
    queryFn: ({ pageParam }) =>
      postApi.getByUserId(userId, { ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.data.hasNextPage ? (lastPage.data.nextCursor ?? undefined) : undefined,
    enabled: !!userId,
  });
}
