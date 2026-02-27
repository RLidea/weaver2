import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';

export const ME_QUERY_KEY = ['auth', 'me'] as const;

export function useMe() {
  const query = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: authApi.getMe,
    staleTime: 5 * 60 * 1000, // 5분 캐시
    retry: false,
  });

  return {
    ...query,
    user: query.data?.data ?? null,
    isAuthenticated: !!query.data?.data,
  };
}
