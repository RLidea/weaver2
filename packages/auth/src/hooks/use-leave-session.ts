'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '../api/auth.api';
import { authKeys } from '../query-keys';

/** sign-out 이 실패한 뒤 저절로는 다시 부르지 않는 시간 */
const AUTOMATIC_RETRY_COOLDOWN_MS = 30_000;

// AuthProvider 와 레이아웃이 같은 순간에 부른다 — 진행 중인 sign-out 하나를 같이 쓴다
let inFlight: Promise<boolean> | null = null;
let lastFailedAt: number | null = null;

function signOutOnce(): Promise<boolean> {
  inFlight ??= authApi
    .signOut()
    .then(
      () => {
        lastFailedAt = null;
        return true;
      },
      () => {
        lastFailedAt = Date.now();
        return false;
      },
    )
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

function failedRecently(): boolean {
  return lastFailedAt !== null && Date.now() - lastFailedAt < AUTOMATIC_RETRY_COOLDOWN_MS;
}

interface LeaveOptions {
  /**
   * 사람이 누른 것이 아니라 401·화면 전환이 부른 것.
   * 막 실패했으면 다시 두드리지 않는다 — 401 은 요청마다 오므로, 그대로 두면 sign-out 이
   * 화면을 옮길 때마다 나가 스로틀에 걸린다. 「다시 시도」 버튼은 이 옵션 없이 부른다.
   */
  automatic?: boolean;
}

/**
 * 세션의 흔적(서버의 인증 쿠키·화면의 me 캐시)을 지운 뒤 로그인 화면으로 보낸다.
 *
 * 둘 중 하나라도 남은 채 `/login` 에 가면 되돌려진다 — 쿠키가 남으면 proxy 가, 「로그인됨」
 * me 캐시가 남으면 (auth) 레이아웃이 `/dashboard` 로 보내고, 화면은 그 사이에서 멈춘다.
 *
 * **쿠키를 못 지웠으면 보내지 않는다.** 보내 봐야 되돌려지고, 되돌아온 화면이 다시 지우러
 * 가며 서버를 두드리는 왕복이 된다. 대신 `failed` 를 세워 「다시 시도」 화면을 그리게 한다.
 * `leave` 는 보냈으면 true 를 돌려준다.
 */
export function useLeaveSession() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const leave = useCallback(
    async (href: string, { automatic = false }: LeaveOptions = {}): Promise<boolean> => {
      if (automatic && failedRecently()) {
        setFailed(true);
        return false;
      }
      setIsLeaving(true);
      const cleared = await signOutOnce();
      setIsLeaving(false);
      setFailed(!cleared);
      if (!cleared) return false;
      queryClient.setQueryData(authKeys.me, null);
      router.replace(href);
      return true;
    },
    [queryClient, router],
  );

  return { leave, failed, isLeaving };
}
