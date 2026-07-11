import { apiClient } from '@weaver2/api-client';
import type {
  AdminUser,
  AdminUsersParams,
  AdminUsersResponse,
  AdminUpdateUserRequest,
  SuspendUserRequest,
} from '../types';

function toQueryString(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export const adminUsersApi = {
  getAll: (params?: AdminUsersParams) =>
    apiClient.get<AdminUsersResponse>(`/v1/admin/users${toQueryString(params ?? {})}`),

  getById: (id: string) =>
    apiClient.get<AdminUser>(`/v1/admin/users/${id}`),

  update: (id: string, body: AdminUpdateUserRequest) =>
    apiClient.patch<AdminUser>(`/v1/admin/users/${id}`, body),

  suspend: (id: string, body: SuspendUserRequest) =>
    apiClient.patch<AdminUser>(`/v1/admin/users/${id}/suspend`, body),

  unsuspend: (id: string) =>
    apiClient.patch<void>(`/v1/admin/users/${id}/unsuspend`),

  delete: (id: string) =>
    apiClient.delete<void>(`/v1/admin/users/${id}`),
};
