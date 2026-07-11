import { apiClient, type KeysetResponse } from '@weaver2/api-client';
import type { Notification } from '../types';

export const notificationApi = {
  getAll: (params?: { cursor?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set('cursor', params.cursor);
    if (params?.limit) qs.set('limit', String(params.limit));
    const str = qs.toString();
    return apiClient.get<KeysetResponse<Notification>>(
      `/v1/notifications${str ? `?${str}` : ''}`,
    );
  },

  getUnreadCount: () =>
    apiClient.get<{ count: number }>('/v1/notifications/unread-count'),

  markRead: (id: string) =>
    apiClient.patch<void>(`/v1/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.patch<void>('/v1/notifications/read-all'),

  getVapidPublicKey: () =>
    apiClient.get<{ publicKey: string }>('/v1/notifications/push-subscription/public-key'),

  savePushSubscription: (data: { endpoint: string; p256dh: string; auth: string }) =>
    apiClient.post<void>('/v1/notifications/push-subscription', data),

  deletePushSubscription: (endpoint: string) =>
    apiClient.deleteWithBody<void>('/v1/notifications/push-subscription', { endpoint }),
};
