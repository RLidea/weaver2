import { useInfiniteQuery } from '@tanstack/react-query';
import { boardApi } from '../api/board.api';
import { boardKeys } from '../query-keys';
import type { KeysetParams } from '../types';

export function useBoardPosts(
  boardId: string,
  params?: Omit<KeysetParams, 'cursor'> & { categoryId?: string },
) {
  const { categoryId, ...keysetParams } = params ?? {};

  return useInfiniteQuery({
    queryKey: boardKeys.posts(boardId, categoryId),
    queryFn: ({ pageParam }) =>
      boardApi.getPosts(boardId, { ...keysetParams, cursor: pageParam, categoryId }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.data.hasNextPage ? (lastPage.data.nextCursor ?? undefined) : undefined,
    enabled: !!boardId,
  });
}
