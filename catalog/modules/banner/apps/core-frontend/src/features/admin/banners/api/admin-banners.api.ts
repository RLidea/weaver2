import { apiClient } from '@/infrastructure/api-client';
import type { AdminBanner, CreateBannerRequest, UpdateBannerRequest } from '../types';

export const adminBannersApi = {
  getAll: () => apiClient.get<AdminBanner[]>('/v1/admin/banners'),
  getById: (id: string) => apiClient.get<AdminBanner>(`/v1/admin/banners/${id}`),
  create: (body: CreateBannerRequest) => apiClient.post<AdminBanner>('/v1/admin/banners', body),
  update: (id: string, body: UpdateBannerRequest) =>
    apiClient.patch<AdminBanner>(`/v1/admin/banners/${id}`, body),
  delete: (id: string) => apiClient.delete<void>(`/v1/admin/banners/${id}`),
};
