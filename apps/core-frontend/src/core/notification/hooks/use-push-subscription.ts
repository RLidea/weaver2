'use client';

import { useCallback } from 'react';
import { notificationApi } from '../api/notification.api';

// TS 5.7 부터 TypedArray 가 버퍼 종류를 제네릭으로 받는다. 표기를 그냥 `Uint8Array`
// 로 두면 기본값 `Uint8Array<ArrayBufferLike>` 가 되어 BufferSource(= ArrayBufferView
// <ArrayBuffer>)에 안 들어간다 — pushManager.subscribe 의 applicationServerKey 자리다.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushSubscription() {
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const { data } = await notificationApi.getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    await notificationApi.savePushSubscription({
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    return true;
  }, []);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    await notificationApi.deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }, []);

  return { subscribe, unsubscribe };
}
