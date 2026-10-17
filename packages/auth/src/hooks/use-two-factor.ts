'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { authKeys } from '../query-keys';

export function useTwoFactorStatus() {
  return useQuery({
    queryKey: authKeys.twoFactorStatus,
    queryFn: authApi.get2faStatus,
    select: (res) => res.data,
  });
}

export function useSetupTotp() {
  return useMutation({
    mutationFn: authApi.startTotpSetup,
    // 실패 안내는 화면이 한다(설정 패널을 닫으며) — 전역 토스트와 겹치지 않게
    meta: { skipGlobalErrorToast: true },
  });
}

export function useConfirmTotpSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => authApi.confirmTotpSetup(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.twoFactorStatus });
    },
  });
}

export function useDisableTotp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => authApi.disableTotp(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.twoFactorStatus });
    },
  });
}

export function useSetupEmailOtp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.setupEmailOtp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.twoFactorStatus });
    },
  });
}

export function useConfirmEmailOtp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => authApi.confirmEmailOtp(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.twoFactorStatus });
    },
  });
}

export function useDisableEmailOtp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => authApi.disableEmailOtp(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.twoFactorStatus });
    },
  });
}
