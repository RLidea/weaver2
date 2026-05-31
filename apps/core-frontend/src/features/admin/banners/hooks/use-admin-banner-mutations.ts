import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminBannersApi } from '../api/admin-banners.api';
import { adminBannerKeys } from '../query-keys';
import type { CreateBannerRequest, UpdateBannerRequest } from '../types';

export function useCreateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBannerRequest) => adminBannersApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminBannerKeys.all });
    },
  });
}

export function useUpdateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBannerRequest }) =>
      adminBannersApi.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminBannerKeys.all });
    },
  });
}

export function useDeleteBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBannersApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminBannerKeys.all });
    },
  });
}
