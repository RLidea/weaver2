import { useMutation } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import type { ChangePasswordRequest } from '../types';

export function useChangePassword() {
  return useMutation({
    mutationFn: (req: ChangePasswordRequest) => userApi.changePassword(req),
  });
}
