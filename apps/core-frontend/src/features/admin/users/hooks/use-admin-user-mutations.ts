import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUsersApi } from '../api/admin-users.api';
import { adminUserKeys } from '../query-keys';
import type { AdminUpdateUserRequest, SuspendUserRequest } from '../types';

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminUpdateUserRequest }) =>
      adminUsersApi.update(id, body),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
    },
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SuspendUserRequest }) =>
      adminUsersApi.suspend(id, body),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
    },
  });
}

export function useUnsuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.unsuspend(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
    },
  });
}
