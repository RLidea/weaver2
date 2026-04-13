import { useQuery } from '@tanstack/react-query';
import { adminDashboardApi } from '../api/admin-dashboard.api';

export function useUserAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics', 'users'],
    queryFn: () => adminDashboardApi.getUserAnalytics(),
    select: (res) => res.data,
    staleTime: 5 * 60_000,
  });
}

export function useContentAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics', 'content'],
    queryFn: () => adminDashboardApi.getContentAnalytics(),
    select: (res) => res.data,
    staleTime: 5 * 60_000,
  });
}
