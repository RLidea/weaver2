import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApiTokensApi } from '../api/admin-api-tokens.api';
import { adminApiTokenKeys } from '../query-keys';
import type { CreateApiTokenRequest } from '../types';

export function useIssueApiToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateApiTokenRequest) => adminApiTokensApi.issue(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminApiTokenKeys.all });
    },
  });
}

export function useRevokeApiToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApiTokensApi.revoke(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminApiTokenKeys.all });
    },
  });
}
