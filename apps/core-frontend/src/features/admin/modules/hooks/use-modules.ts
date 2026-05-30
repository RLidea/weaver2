import { useQuery } from '@tanstack/react-query';
import { adminModulesApi } from '../api/admin-modules.api';
import { adminModuleKeys } from '../query-keys';

export function useModules() {
  return useQuery({
    queryKey: adminModuleKeys.graph(),
    queryFn: () => adminModulesApi.getAll(),
    select: (res) => res.data,
    staleTime: 60_000,
  });
}
