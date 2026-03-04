import { apiClient } from '@/infrastructure/api-client';
import type { Report, ReportsParams, ReportsResponse, ResolveReportRequest } from '../types';

function toQueryString(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export const adminReportsApi = {
  getAll: (params?: ReportsParams) =>
    apiClient.get<ReportsResponse>(`/v1/admin/reports${toQueryString(params ?? {})}`),

  getById: (id: string) =>
    apiClient.get<Report>(`/v1/admin/reports/${id}`),

  startReview: (id: string) =>
    apiClient.patch<Report>(`/v1/admin/reports/${id}/review`),

  resolve: (id: string, body: ResolveReportRequest) =>
    apiClient.patch<Report>(`/v1/admin/reports/${id}/resolve`, body),

  dismiss: (id: string, moderatorNote?: string) =>
    apiClient.patch<Report>(`/v1/admin/reports/${id}/dismiss`, { moderatorNote }),
};
