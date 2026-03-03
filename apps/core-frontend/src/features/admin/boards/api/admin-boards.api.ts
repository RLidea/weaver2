import { apiClient } from '@/infrastructure/api-client';
import type {
  AdminBoard,
  BoardPermissionItem,
  CreateBoardRequest,
  UpdateBoardRequest,
  UpdateBoardPermissionsRequest,
} from '../types';

export const adminBoardsApi = {
  getAll: () =>
    apiClient.get<AdminBoard[]>('/v1/admin/content/boards'),

  getPermissions: (boardId: string) =>
    apiClient.get<BoardPermissionItem[]>(`/v1/admin/content/boards/${boardId}/permissions`),

  updatePermissions: (boardId: string, permissions: UpdateBoardPermissionsRequest[]) =>
    apiClient.patch<BoardPermissionItem[]>(
      `/v1/admin/content/boards/${boardId}/permissions`,
      permissions,
    ),

  delete: (boardId: string) =>
    apiClient.delete<void>(`/v1/admin/content/boards/${boardId}`),

  // Board CRUD via regular board API
  create: (body: CreateBoardRequest) =>
    apiClient.post<AdminBoard>('/v1/boards', body),

  update: (id: string, body: UpdateBoardRequest) =>
    apiClient.patch<AdminBoard>(`/v1/boards/${id}`, body),
};
