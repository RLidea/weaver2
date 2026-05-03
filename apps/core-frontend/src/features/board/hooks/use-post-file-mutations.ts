import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadApi } from '../api/upload.api';
import { postFileKeys } from './use-post-files';

export function useDeletePostFile(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => uploadApi.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postFileKeys.byPost(postId) });
    },
  });
}
