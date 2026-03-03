import { useQuery } from '@tanstack/react-query';
import { postApi } from '@/features/board/api/post.api';
import type { Post } from '@/features/board/types';

export function useRecentPosts(limit = 5) {
  return useQuery({
    queryKey: ['posts', 'recent', limit],
    queryFn: () => postApi.getAll({ limit }),
    select: (res): Post[] => res.data.items,
    staleTime: 60 * 1000,
  });
}
