import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '@/features/notification/api/notification.api';
import { notificationKeys } from '@/features/notification/query-keys';

export function useRecentNotifications(limit = 3) {
  return useQuery({
    queryKey: [...notificationKeys.lists, 'recent', limit],
    queryFn: () => notificationApi.getAll({ limit }),
    select: (res) => res.data.items,
  });
}
