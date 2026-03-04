import { apiClient } from '@/infrastructure/api-client';
import type { SystemSettings, UpdateSystemSettingsDto } from '../types';

export const adminSettingsApi = {
  get: () => apiClient.get<SystemSettings>('/v1/admin/system-settings'),
  update: (dto: UpdateSystemSettingsDto) =>
    apiClient.put<SystemSettings>('/v1/admin/system-settings', dto),
  reset: () => apiClient.post<SystemSettings>('/v1/admin/system-settings/reset', {}),
};
