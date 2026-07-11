import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import { authKeys } from '@weaver2/auth';
import type { UpdateProfileRequest } from '../types';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: UpdateProfileRequest) => userApi.updateProfile(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}
