import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminBoardsApi } from '../api/admin-boards.api';
import { adminBoardKeys } from '../query-keys';
import type { CreateBoardRequest, UpdateBoardRequest, UpdateBoardPermissionsRequest } from '../types';

export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBoardRequest) => adminBoardsApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminBoardKeys.all });
    },
  });
}

export function useUpdateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBoardRequest }) =>
      adminBoardsApi.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminBoardKeys.all });
    },
  });
}

export function useUpdateBoardPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      boardId,
      permissions,
    }: {
      boardId: string;
      permissions: UpdateBoardPermissionsRequest[];
    }) => adminBoardsApi.updatePermissions(boardId, permissions),
    onSuccess: (_, { boardId }) => {
      void queryClient.invalidateQueries({ queryKey: adminBoardKeys.permissions(boardId) });
      void queryClient.invalidateQueries({ queryKey: adminBoardKeys.all });
    },
  });
}

export function useDeleteBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBoardsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminBoardKeys.all });
    },
  });
}
