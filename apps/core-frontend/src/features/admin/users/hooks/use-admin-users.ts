import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminUsersApi } from '../api/admin-users.api';
import { adminUserKeys } from '../query-keys';
import type { AdminUsersParams } from '../types';

export function useAdminUsers(params?: AdminUsersParams) {
  return useQuery({
    queryKey: adminUserKeys.lists(params),
    queryFn: () => adminUsersApi.getAll(params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
