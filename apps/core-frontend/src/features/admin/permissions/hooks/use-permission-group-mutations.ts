import { useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionGroupsApi } from '../api/permission-groups.api';
import { permissionGroupKeys } from '../query-keys';
import type { CreatePermissionGroupRequest, UpdatePermissionGroupRequest } from '../types';

export function useCreatePermissionGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePermissionGroupRequest) =>
      permissionGroupsApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: permissionGroupKeys.all });
    },
  });
}

export function useUpdatePermissionGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePermissionGroupRequest }) =>
      permissionGroupsApi.update(id, body),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: permissionGroupKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: permissionGroupKeys.all });
    },
  });
}

export function useDeletePermissionGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => permissionGroupsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: permissionGroupKeys.all });
    },
  });
}

export function useSetGroupPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      permissionGroupsApi.setPermissions(id, permissions),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: permissionGroupKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: permissionGroupKeys.all });
    },
  });
}

export function useAssignUsersToGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userIds }: { groupId: string; userIds: string[] }) =>
      permissionGroupsApi.assignUsers(groupId, userIds),
    onSuccess: (_, { groupId }) => {
      void queryClient.invalidateQueries({ queryKey: permissionGroupKeys.users(groupId) });
      void queryClient.invalidateQueries({ queryKey: permissionGroupKeys.all });
    },
  });
}

export function useRemoveUserFromGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      permissionGroupsApi.removeUser(groupId, userId),
    onSuccess: (_, { groupId }) => {
      void queryClient.invalidateQueries({ queryKey: permissionGroupKeys.users(groupId) });
      void queryClient.invalidateQueries({ queryKey: permissionGroupKeys.all });
    },
  });
}
