import { useMutation, useQueryClient } from '@tanstack/react-query';
import { termsApi } from '../api/terms.api';
import { termsKeys } from '../query-keys';
import type { CreateTermsRequest, UpdateTermsRequest } from '../types';

export function useCreateTerms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermsRequest) => termsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: termsKeys.latest });
    },
  });
}

export function useUpdateTerms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTermsRequest }) =>
      termsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: termsKeys.latest });
    },
  });
}

export function useDeleteTerms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => termsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: termsKeys.latest });
    },
  });
}
