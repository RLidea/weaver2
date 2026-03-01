import { useInfiniteQuery } from '@tanstack/react-query';
import { notificationApi } from '../api/notification.api';
import { notificationKeys } from '../query-keys';

export function useNotifications(limit = 20) {
  return useInfiniteQuery({
    queryKey: notificationKeys.lists,
    queryFn: ({ pageParam }) =>
      notificationApi.getAll({ cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.data.meta.hasNextPage ? lastPage.data.meta.nextCursor : undefined,
  });
}
