import { useQuery } from '@tanstack/react-query';
import { postApi } from '../api/post.api';
import { postKeys } from '../query-keys';

export function usePost(postId: string) {
  return useQuery({
    queryKey: postKeys.detail(postId),
    queryFn: () => postApi.getById(postId),
    select: (res) => res.data,
    enabled: !!postId,
  });
}
