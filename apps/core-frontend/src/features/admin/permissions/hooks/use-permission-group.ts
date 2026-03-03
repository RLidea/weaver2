import { useQuery } from '@tanstack/react-query';
import { permissionGroupsApi } from '../api/permission-groups.api';
import { permissionGroupKeys } from '../query-keys';

export function usePermissionGroup(id: string | null) {
  return useQuery({
    queryKey: permissionGroupKeys.detail(id ?? ''),
    queryFn: () => permissionGroupsApi.getById(id!),
    select: (res) => res.data,
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useGroupUsers(id: string | null) {
  return useQuery({
    queryKey: permissionGroupKeys.users(id ?? ''),
    queryFn: () => permissionGroupsApi.getUsers(id!),
    select: (res) => res.data,
    enabled: !!id,
    staleTime: 30_000,
  });
}
