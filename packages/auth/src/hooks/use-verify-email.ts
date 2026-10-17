'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { VerifyEmailRequest } from '../types';

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (body: VerifyEmailRequest) => authApi.verifyEmail(body),
  });
}
