'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '../api/auth.api';
import { authKeys } from '../query-keys';

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.signOut,
    onSettled: () => {
      // 성공/실패 여부 관계없이 로컬 상태 즉시 클리어
      queryClient.setQueryData(authKeys.me, null);
      router.push('/login');
    },
  });
}
