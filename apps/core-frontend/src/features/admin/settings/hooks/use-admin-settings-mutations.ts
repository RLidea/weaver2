import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSettingsApi } from '../api/admin-settings.api';
import { adminSettingsKeys } from './use-admin-settings';
import type { UpdateSystemSettingsDto } from '../types';

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateSystemSettingsDto) => adminSettingsApi.update(dto),
    onSuccess: (res) => {
      queryClient.setQueryData(adminSettingsKeys.all, res);
    },
  });
}

export function useResetAdminSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminSettingsApi.reset(),
    onSuccess: (res) => {
      queryClient.setQueryData(adminSettingsKeys.all, res);
    },
  });
}
