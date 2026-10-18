'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '../api/auth.api';
import { authKeys } from '../query-keys';

// AuthProvider 와 레이아웃이 같은 순간에 부른다 — 진행 중인 sign-out 하나를 같이 쓴다
let inFlight: Promise<boolean> | null = null;

function signOutOnce(): Promise<boolean> {
  inFlight ??= authApi
    .signOut()
    .then(
      () => true,
      () => false,
    )
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * 세션의 흔적(서버의 인증 쿠키·화면의 me 캐시)을 지운 뒤 로그인 화면으로 보낸다.
 *
 * 둘 중 하나라도 남은 채 `/login` 에 가면 되돌려진다 — 쿠키가 남으면 proxy 가, 「로그인됨」
 * me 캐시가 남으면 (auth) 레이아웃이 `/dashboard` 로 보내고, 화면은 그 사이에서 멈춘다.
 *
 * **쿠키를 못 지웠으면 보내지 않는다.** 보내 봐야 되돌려지고, 되돌아온 화면이 다시 지우러
 * 가며 서버를 두드리는 왕복이 된다. 대신 `failed` 를 세워 「다시 시도」 화면을 그리게 한다.
 */
export function useLeaveSession() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const leave = useCallback(
    async (href: string) => {
      setIsLeaving(true);
      const cleared = await signOutOnce();
      setIsLeaving(false);
      setFailed(!cleared);
      if (!cleared) return;
      queryClient.setQueryData(authKeys.me, null);
      router.replace(href);
    },
    [queryClient, router],
  );

  return { leave, failed, isLeaving };
}
