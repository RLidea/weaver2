import { useQuery } from '@tanstack/react-query';
import { permissionGroupsApi } from '../api/permission-groups.api';
import { permissionGroupKeys } from '../query-keys';

export function usePermissionGroups() {
  return useQuery({
    queryKey: permissionGroupKeys.all,
    queryFn: () => permissionGroupsApi.getAll(),
    select: (res) => res.data,
    staleTime: 30_000,
  });
}
