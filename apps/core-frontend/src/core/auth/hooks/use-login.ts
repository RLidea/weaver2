import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { userKeys } from '@/core/user/query-keys';
import type { SignInRequest } from '../types';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: SignInRequest) => authApi.signIn(req),
    onSuccess: async () => {
      // 로그인 성공 → me 쿼리 갱신 (캐시가 인증 상태의 진실의 원천)
      await queryClient.invalidateQueries({ queryKey: userKeys.me });
    },
  });
}
