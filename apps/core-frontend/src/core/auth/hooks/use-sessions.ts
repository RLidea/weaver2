import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authKeys } from '../query-keys';

export function useSessions() {
  return useQuery({
    queryKey: authKeys.sessions,
    queryFn: authApi.listSessions,
    select: (res) => res.data,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.sessions });
    },
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.revokeOtherSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.sessions });
    },
  });
}
