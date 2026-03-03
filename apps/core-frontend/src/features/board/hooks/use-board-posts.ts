import { useInfiniteQuery } from '@tanstack/react-query';
import { boardApi } from '../api/board.api';
import { boardKeys } from '../query-keys';
import type { KeysetParams } from '../types';

export function useBoardPosts(boardId: string, params?: Omit<KeysetParams, 'cursor'>) {
  return useInfiniteQuery({
    queryKey: boardKeys.posts(boardId),
    queryFn: ({ pageParam }) =>
      boardApi.getPosts(boardId, { ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.data.hasNextPage ? (lastPage.data.nextCursor ?? undefined) : undefined,
    enabled: !!boardId,
  });
}
