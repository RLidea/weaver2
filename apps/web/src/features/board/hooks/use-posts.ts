import { useInfiniteQuery } from '@tanstack/react-query';
import { postApi } from '../api/post.api';
import { postKeys } from '../query-keys';
import type { KeysetParams } from '../types';

interface UsePostsParams extends Omit<KeysetParams, 'cursor'> {
  boardId?: string;
}

export function usePosts(params?: UsePostsParams) {
  return useInfiniteQuery({
    queryKey: postKeys.lists(params),
    queryFn: ({ pageParam }) =>
      postApi.getAll({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.data.meta.hasNextPage ? lastPage.data.meta.nextCursor : undefined,
  });
}
