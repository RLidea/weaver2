import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { userApi } from '../api/user.api';

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: userApi.deleteAccount,
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });
}
