'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { RequestPasswordResetRequest, ResetPasswordRequest } from '../types';

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (req: RequestPasswordResetRequest) => authApi.requestPasswordReset(req),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (req: ResetPasswordRequest) => authApi.resetPassword(req),
  });
}
