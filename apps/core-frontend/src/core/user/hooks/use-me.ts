import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import { userKeys } from '../query-keys';
import { ApiError } from '@/types/api';

export function useMe() {
  const query = useQuery({
    queryKey: userKeys.me,
    queryFn: async () => {
      try {
        return await userApi.getMe();
      } catch (err) {
        // 비로그인 상태(401)는 정상 케이스 — onAuthError 발동 없이 null 반환
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시
    retry: false,
  });

  return {
    ...query,
    user: query.data?.data ?? null,
    isAuthenticated: !!query.data?.data,
  };
}
