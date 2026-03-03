import { useQuery } from '@tanstack/react-query';
import { adminUsersApi } from '../api/admin-users.api';
import { adminUserKeys } from '../query-keys';

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: adminUserKeys.detail(id),
    queryFn: () => adminUsersApi.getById(id),
    select: (res) => res.data,
    enabled: !!id,
    staleTime: 30_000,
  });
}
