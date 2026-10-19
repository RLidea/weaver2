'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authKeys } from '../query-keys';

/**
 * 켜진 로그인 수단(`GET /v1/auth/providers`). `sso` 면 화면은 로컬 로그인 · 가입 · 재설정 ·
 * 비밀번호 · 2FA 칸을 그리지 않는다 — 그 경로는 서버에서 404 로 닫혀 있다.
 * 서버 설정이라 세션 동안 바뀌지 않는다.
 */
export function useAuthProviders() {
  const query = useQuery({
    queryKey: authKeys.providers,
    queryFn: () => authApi.getProviders(),
    select: (res) => res.data,
    staleTime: Infinity,
  });
  return {
    ...query,
    providers: query.data ?? null,
    isSso: query.data?.sso === true,
  };
}
