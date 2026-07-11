import { apiClient } from '@weaver2/api-client';
import type { DashboardSummary, UserAnalytics, ContentAnalytics, AnalyticsTimeRange } from '../types';

function toQueryString(params: AnalyticsTimeRange): string {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export const adminDashboardApi = {
  getSummary: () => apiClient.get<DashboardSummary>('/v1/admin/dashboard/summary'),

  getUserAnalytics: (range?: AnalyticsTimeRange) =>
    apiClient.get<UserAnalytics>(`/v1/admin/analytics/users${toQueryString(range ?? {})}`),

  getContentAnalytics: (range?: AnalyticsTimeRange) =>
    apiClient.get<ContentAnalytics>(`/v1/admin/analytics/content${toQueryString(range ?? {})}`),
};
