import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import { userKeys } from '../query-keys';

export function useUserProfile(username: string) {
  return useQuery({
    queryKey: userKeys.profile(username),
    queryFn: () => userApi.getByUsername(username),
    select: (res) => res.data,
    enabled: !!username,
  });
}
