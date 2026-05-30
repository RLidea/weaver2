import { apiClient } from '@/infrastructure/api-client';
import type {
  AbuseReport,
  AbuseReportsParams,
  AbuseReportsResponse,
  ResolveAbuseReportRequest,
} from '../types';

function toQueryString(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export const adminAbuseReportsApi = {
  getAll: (params?: AbuseReportsParams) =>
    apiClient.get<AbuseReportsResponse>(
      `/v1/admin/abuse-reports${toQueryString(params ?? {})}`,
    ),

  getById: (id: string) =>
    apiClient.get<AbuseReport>(`/v1/admin/abuse-reports/${id}`),

  startReview: (id: string) =>
    apiClient.patch<AbuseReport>(`/v1/admin/abuse-reports/${id}/review`),

  resolve: (id: string, body: ResolveAbuseReportRequest) =>
    apiClient.patch<AbuseReport>(`/v1/admin/abuse-reports/${id}/resolve`, body),

  dismiss: (id: string, moderatorNote?: string) =>
    apiClient.patch<AbuseReport>(`/v1/admin/abuse-reports/${id}/dismiss`, {
      moderatorNote,
    }),
};
