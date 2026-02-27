import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '../api/auth.api';
import { ME_QUERY_KEY } from './use-me';

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.signOut,
    onSettled: () => {
      // 성공/실패 여부 관계없이 로컬 상태 즉시 클리어
      queryClient.setQueryData(ME_QUERY_KEY, null);
      router.push('/login');
    },
  });
}
