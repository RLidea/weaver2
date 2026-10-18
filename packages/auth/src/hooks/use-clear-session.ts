'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authKeys } from '../query-keys';

/**
 * 로그인 화면으로 보내기 전에 세션의 흔적을 지운다 — 서버의 인증 쿠키와 화면의 me 캐시.
 *
 * 서버가 세션을 거절했는데 둘 중 하나라도 남은 채 `/login` 에 가면 되돌려진다.
 * 쿠키가 남으면 proxy 가, 「로그인됨」 me 캐시가 남으면 (auth) 레이아웃이 `/dashboard` 로
 * 보내고, 화면은 그 사이에서 스피너로 멈춘다. 쿠키 지우기가 실패해도 이동은 해야 하므로 삼킨다.
 */
export function useClearSession() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await authApi.signOut().catch(() => undefined);
    queryClient.setQueryData(authKeys.me, null);
  }, [queryClient]);
}
