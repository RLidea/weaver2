import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notification.api';
import { notificationKeys } from '../query-keys';

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}
