'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authKeys } from '../query-keys';
import type { SignInRequest, TwoFactorAuthenticateRequest } from '../types';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: SignInRequest) => authApi.signIn(req),
    onSuccess: async (res) => {
      // 2FA가 필요한 경우는 호출자가 처리
      if (res?.data?.twoFactorRequired) return;
      // 일반 로그인 성공 → me 쿼리 갱신
      await queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

export function useTwoFactorLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: TwoFactorAuthenticateRequest) => authApi.twoFactorAuthenticate(req),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

export function useSendLoginEmailOtp() {
  return useMutation({
    mutationFn: (preAuthToken: string) => authApi.sendLoginEmailOtp(preAuthToken),
  });
}
