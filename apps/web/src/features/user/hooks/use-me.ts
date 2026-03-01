import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import { userKeys } from '../query-keys';

export function useMe() {
  const query = useQuery({
    queryKey: userKeys.me,
    queryFn: userApi.getMe,
    staleTime: 5 * 60 * 1000, // 5분 캐시
    retry: false,
  });

  return {
    ...query,
    user: query.data?.data ?? null,
    isAuthenticated: !!query.data?.data,
  };
}
