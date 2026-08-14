import { apiClient, toQueryString } from '@weaver2/api-client';
import type { Report, ReportsParams, ReportsResponse, ResolveReportRequest } from '../types';

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
