import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '@/core/notification/api/notification.api';
import { notificationKeys } from '@/core/notification/query-keys';

export function useRecentNotifications(limit = 3) {
  return useQuery({
    queryKey: [...notificationKeys.lists, 'recent', limit],
    queryFn: () => notificationApi.getAll({ limit }),
    select: (res) => res.data.data,
  });
}
