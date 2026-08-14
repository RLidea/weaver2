'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authKeys } from '../query-keys';
import { ApiError } from '@weaver2/api-client';

export function useMe() {
  const query = useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        return await authApi.getMe();
      } catch (err) {
        // 비로그인 상태(401)는 정상 케이스 — onAuthError 발동 없이 null 반환
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시
    // 4xx 는 다시 물어도 답이 같으니 그대로 두고, **5xx·네트워크 오류만 재시도**한다.
    // 서버가 잠깐 아픈 것과 로그인이 풀린 것은 다른 일인데, 재시도가 아예 없으면
    // 순간적인 장애 한 번이 곧바로 "사용자 없음" 으로 굳어버린다.
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status < 500) return false;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  return {
    ...query,
    user: query.data?.data ?? null,
    isAuthenticated: !!query.data?.data,
    /**
     * **서버가 답을 주지 못한 상태** — "로그아웃" 과 반드시 구분해야 한다.
     *
     * 이걸 구분하지 않으면 세션이 멀쩡한데도 화면이 로그인으로 튕기고, 쿠키가 남아
     * 있어 엣지 미들웨어가 되돌리는 바람에 아무것도 그려지지 않는 상태로 굳는다.
     * (2026-08-14 재현: `/v1/users/me` 만 500 으로 만들면 관리자 화면이 빈 화면이 됐다)
     *
     * 데이터를 한 번이라도 받아둔 뒤의 실패는 여기 해당하지 않는다 — 그때는 직전
     * 사용자 정보로 화면을 계속 보여주는 편이 낫다.
     */
    isUnavailable: query.isError && query.data === undefined,
  };
}
