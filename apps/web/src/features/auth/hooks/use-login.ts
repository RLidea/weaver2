import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, SignInRequest } from '../api/auth.api';
import { ME_QUERY_KEY } from './use-me';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: SignInRequest) => authApi.signIn(req),
    onSuccess: async () => {
      // 로그인 성공 → me 쿼리 갱신 (AuthProvider가 아닌 캐시가 진실의 원천)
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
