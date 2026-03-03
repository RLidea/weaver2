import { apiClient } from '@/infrastructure/api-client';
import type { Terms, CreateTermsRequest, UpdateTermsRequest } from '../types';

export const termsApi = {
  getLatest: () => apiClient.get<Terms[]>('/v1/terms/latest'),

  create: (data: CreateTermsRequest) =>
    apiClient.post<Terms>('/v1/terms', data),

  update: (id: string, data: UpdateTermsRequest) =>
    apiClient.patch<Terms>(`/v1/terms/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/v1/terms/${id}`),
};
