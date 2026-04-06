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
  return useQuery({
    queryKey: ['auth', '2fa', 'totp-setup'],
    queryFn: authApi.getTotpSetup,
    select: (res) => res.data,
    enabled: false,
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
