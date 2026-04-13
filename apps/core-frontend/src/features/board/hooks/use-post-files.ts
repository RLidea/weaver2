import { useQuery } from '@tanstack/react-query';
import { uploadApi } from '../api/upload.api';

export const postFileKeys = {
  byPost: (postId: string) => ['postFiles', postId] as const,
};

export function usePostFiles(postId: string) {
  return useQuery({
    queryKey: postFileKeys.byPost(postId),
    queryFn: () => uploadApi.getPostFiles(postId),
    select: (res) => res.data,
    enabled: !!postId,
  });
}
