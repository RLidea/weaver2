import { useInfiniteQuery } from '@tanstack/react-query';
import { postApi } from '@/features/board/api/post.api';
import { postKeys } from '@/features/board/query-keys';

export function useUserPosts(userId: string) {
  return useInfiniteQuery({
    queryKey: postKeys.byUser(userId),
    queryFn: ({ pageParam }) =>
      postApi.getByUserId(userId, { cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      const data = lastPage.data as { hasNextPage: boolean; nextCursor: string | null };
      return data.hasNextPage ? (data.nextCursor ?? undefined) : undefined;
    },
    enabled: !!userId,
  });
}
