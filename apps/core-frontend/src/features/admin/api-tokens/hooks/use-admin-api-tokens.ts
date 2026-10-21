import { useQuery } from '@tanstack/react-query';
import { adminApiTokensApi } from '../api/admin-api-tokens.api';
import { adminApiTokenKeys } from '../query-keys';

export function useAdminApiTokens() {
  return useQuery({
    queryKey: adminApiTokenKeys.all,
    queryFn: () => adminApiTokensApi.getAll(),
    select: (res) => res.data,
    staleTime: 30_000,
  });
}
