import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import { userKeys } from '../query-keys';
import type { UpdateProfileRequest } from '../types';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: UpdateProfileRequest) => userApi.updateProfile(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me });
    },
  });
}
