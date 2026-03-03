import { apiClient } from '@/infrastructure/api-client';
import type { DashboardSummary } from '../types';

export const adminDashboardApi = {
  getSummary: () => apiClient.get<DashboardSummary>('/v1/admin/dashboard/summary'),
};
