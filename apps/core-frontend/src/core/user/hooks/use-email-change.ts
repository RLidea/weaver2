import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import { userKeys } from '../query-keys';
import type { RequestEmailChangeRequest, ConfirmEmailChangeRequest } from '../types';

export function useRequestEmailChange() {
  return useMutation({
    mutationFn: (req: RequestEmailChangeRequest) => userApi.requestEmailChange(req),
  });
}

export function useConfirmEmailChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: ConfirmEmailChangeRequest) => userApi.confirmEmailChange(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me });
    },
  });
}
