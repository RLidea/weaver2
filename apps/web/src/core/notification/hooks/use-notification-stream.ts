'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from '../query-keys';
import type { Notification } from '../types';

/**
 * SSE로 실시간 알림을 수신하는 훅.
 *
 * - 인증: 쿠키(same-origin) 기반. Next.js proxy(/api)를 통해 same-origin으로 전달.
 * - 새 알림 수신 시: unread-count 즉시 갱신 + notifications 목록 갱신
 * - 컴포넌트 언마운트 시 EventSource 자동 close.
 * - 인증되지 않은 상태에서는 연결하지 않는다.
 */
export function useNotificationStream(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
    const url = `${apiUrl}/v1/notifications/stream`;

    const es = new EventSource(url, { withCredentials: true });

    es.onmessage = (event: MessageEvent<string>) => {
      // 새 알림 페이로드를 unread-count 캐시에 즉시 반영
      queryClient.setQueryData(
        notificationKeys.unreadCount,
        (prev: { data: { count: number } } | undefined) => {
          if (!prev) return prev;
          return { ...prev, data: { count: prev.data.count + 1 } };
        },
      );

      // 알림 목록은 refetch — 목록 상단에 신규 알림이 나타나야 하므로
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists });

      // onMessage 콜백으로 수신 데이터를 전달하고 싶은 컴포넌트를 위해
      // 캐시에 임시 키로 마지막 이벤트를 저장
      try {
        const notification = JSON.parse(event.data) as Notification;
        queryClient.setQueryData(['notifications', 'last-event'], notification);
      } catch {
        // 파싱 실패는 무시 (heartbeat 메시지 등)
      }
    };

    es.onerror = () => {
      // EventSource는 오류 발생 시 자동으로 재연결을 시도함
      // 명시적 처리가 필요하면 여기서 상태를 노출할 수 있음
    };

    return () => {
      es.close();
    };
  }, [enabled, queryClient]);
}
