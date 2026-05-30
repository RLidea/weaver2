import { apiClient } from '@/infrastructure/api-client';
import type { ModulesResponse } from '../types';

export const adminModulesApi = {
  getAll: () => apiClient.get<ModulesResponse>('/v1/admin/modules'),
};
