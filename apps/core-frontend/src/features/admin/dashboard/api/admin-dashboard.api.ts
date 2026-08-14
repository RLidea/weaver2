import { apiClient, toQueryString } from '@weaver2/api-client';
import type { DashboardSummary, UserAnalytics, ContentAnalytics, AnalyticsTimeRange } from '../types';

export const adminDashboardApi = {
  getSummary: () => apiClient.get<DashboardSummary>('/v1/admin/dashboard/summary'),

  getUserAnalytics: (range?: AnalyticsTimeRange) =>
    apiClient.get<UserAnalytics>(`/v1/admin/analytics/users${toQueryString(range ?? {})}`),

  getContentAnalytics: (range?: AnalyticsTimeRange) =>
    apiClient.get<ContentAnalytics>(`/v1/admin/analytics/content${toQueryString(range ?? {})}`),
};
