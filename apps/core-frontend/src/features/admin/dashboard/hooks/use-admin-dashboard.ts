import { useQuery } from '@tanstack/react-query';
import { adminDashboardApi } from '../api/admin-dashboard.api';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'summary'],
    queryFn: () => adminDashboardApi.getSummary(),
    select: (res) => res.data,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
