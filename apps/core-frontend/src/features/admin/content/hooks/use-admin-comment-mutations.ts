import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCommentsApi } from '../api/admin-comments.api';
import { adminCommentKeys } from './use-admin-comments';

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => adminCommentsApi.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCommentKeys.all });
    },
  });
}
