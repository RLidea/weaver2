import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../api/notification.api';
import { notificationKeys } from '../query-keys';

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: notificationApi.getUnreadCount,
    select: (res) => res.data.count,
    staleTime: 30 * 1000, // SSE가 실시간 갱신하므로 30초면 충분
  });
}
