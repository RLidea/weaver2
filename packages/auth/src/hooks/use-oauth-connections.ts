'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authKeys } from '../query-keys';

export function useOAuthConnections() {
  return useQuery({
    queryKey: authKeys.oauthConnections,
    queryFn: () => authApi.getOAuthConnections(),
    select: (res) => res.data,
  });
}

export function useDisconnectOAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: string) => authApi.disconnectOAuth(provider),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.oauthConnections });
    },
  });
}
