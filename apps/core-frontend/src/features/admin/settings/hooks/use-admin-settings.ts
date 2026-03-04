import { useQuery } from '@tanstack/react-query';
import { adminSettingsApi } from '../api/admin-settings.api';

export const adminSettingsKeys = {
  all: ['admin', 'system-settings'] as const,
};

export function useAdminSettings() {
  return useQuery({
    queryKey: adminSettingsKeys.all,
    queryFn: () => adminSettingsApi.get(),
    select: (res) => res.data,
    staleTime: 30_000,
  });
}
