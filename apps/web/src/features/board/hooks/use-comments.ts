import { useQuery } from '@tanstack/react-query';
import { commentApi } from '../api/comment.api';
import { commentKeys } from '../query-keys';

export function useComments(postId: string) {
  return useQuery({
    queryKey: commentKeys.byPost(postId),
    queryFn: () => commentApi.getByPost(postId),
    select: (res) => res.data,
    enabled: !!postId,
  });
}
