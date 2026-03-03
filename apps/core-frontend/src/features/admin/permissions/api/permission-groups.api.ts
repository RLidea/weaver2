import { apiClient } from '@/infrastructure/api-client';
import type {
  PermissionGroup,
  PermissionGroupDetail,
  GroupUser,
  CreatePermissionGroupRequest,
  UpdatePermissionGroupRequest,
} from '../types';

export const permissionGroupsApi = {
  getAll: () =>
    apiClient.get<PermissionGroup[]>('/v1/admin/permissions/groups'),

  getById: (id: string) =>
    apiClient.get<PermissionGroupDetail>(`/v1/admin/permissions/groups/${id}`),

  create: (body: CreatePermissionGroupRequest) =>
    apiClient.post<PermissionGroup>('/v1/admin/permissions/groups', body),

  update: (id: string, body: UpdatePermissionGroupRequest) =>
    apiClient.patch<PermissionGroup>(`/v1/admin/permissions/groups/${id}`, body),

  delete: (id: string) =>
    apiClient.delete<void>(`/v1/admin/permissions/groups/${id}`),

  setPermissions: (id: string, permissions: string[]) =>
    apiClient.put<PermissionGroupDetail>(
      `/v1/admin/permissions/groups/${id}/permissions`,
      { permissions },
    ),

  getUsers: (id: string) =>
    apiClient.get<GroupUser[]>(`/v1/admin/permissions/groups/${id}/users`),

  assignUsers: (id: string, userIds: string[]) =>
    apiClient.post<{ assigned: number; skipped: number; message: string }>(
      `/v1/admin/permissions/groups/${id}/users`,
      { userIds },
    ),

  removeUser: (groupId: string, userId: string) =>
    apiClient.delete<void>(`/v1/admin/permissions/groups/${groupId}/users/${userId}`),
};
