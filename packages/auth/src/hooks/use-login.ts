'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authKeys } from '../query-keys';
import { forgetLeaveFailure } from './use-leave-session';
import type { SignInRequest, TwoFactorAuthenticateRequest } from '../types';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: SignInRequest) => authApi.signIn(req),
    onSuccess: async (res) => {
      // 2FA가 필요한 경우는 호출자가 처리
      if (res?.data?.twoFactorRequired) return;
      // 일반 로그인 성공 → me 쿼리 갱신
      forgetLeaveFailure();
      await queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

export function useTwoFactorLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: TwoFactorAuthenticateRequest) => authApi.twoFactorAuthenticate(req),
    // 틀린 코드는 401 이라 전역 처리기가 「인증이 필요합니다」 토스트를 띄운다 — 다시 로그인하라는
    // 뜻으로 읽힌다. 로그인 폼이 코드 칸 아래에 안내하므로 전역 토스트는 건너뛴다(e2e 화면에서 잡았다).
    meta: { skipGlobalErrorToast: true },
    onSuccess: async () => {
      forgetLeaveFailure();
      await queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

export function useSendLoginEmailOtp() {
  return useMutation({
    mutationFn: () => authApi.sendLoginEmailOtp(),
  });
}
