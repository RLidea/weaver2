import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPostsApi } from '../api/admin-posts.api';
import { adminPostKeys } from './use-admin-posts';
import type { PostStatus } from '../types';

export function useUpdatePostStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, status }: { postId: string; status: PostStatus }) =>
      adminPostsApi.updateStatus(postId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminPostKeys.all });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => adminPostsApi.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminPostKeys.all });
    },
  });
}
