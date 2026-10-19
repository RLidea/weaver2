import { apiClient } from '@weaver2/api-client';
import type { ApiToken, CreateApiTokenRequest, IssuedApiToken } from '../types';

export const adminApiTokensApi = {
  getAll: () => apiClient.get<ApiToken[]>('/v1/admin/api-tokens'),

  issue: (body: CreateApiTokenRequest) =>
    apiClient.post<IssuedApiToken>('/v1/admin/api-tokens', body),

  revoke: (id: string) =>
    apiClient.post<ApiToken>(`/v1/admin/api-tokens/${id}/revoke`),
};
