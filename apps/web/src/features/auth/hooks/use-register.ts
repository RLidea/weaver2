import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { SignUpRequest } from '../types';

export function useRegister() {
  return useMutation({
    mutationFn: (req: SignUpRequest) => authApi.signUp(req),
  });
}
