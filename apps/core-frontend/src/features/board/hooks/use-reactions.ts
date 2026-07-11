import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentApi } from '../api/comment.api';
import { reactionKeys } from '../query-keys';
import type { ApiResponse } from '@weaver2/api-client';
import type { PostReactions } from '../types';

export function useReactions(postId: string) {
  return useQuery({
    queryKey: reactionKeys.byPost(postId),
    queryFn: () => commentApi.getReactions(postId),
    select: (res) => res.data,
    enabled: !!postId,
  });
}

export function useAddReaction(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emojiId: string) => commentApi.addReaction(postId, emojiId),
    onSuccess: (res: ApiResponse<PostReactions>) => {
      // 서버가 최신 상태를 반환하므로 invalidate 대신 직접 갱신
      queryClient.setQueryData(reactionKeys.byPost(postId), res);
    },
  });
}

export function useRemoveReaction(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emojiId: string) => commentApi.removeReaction(postId, emojiId),
    onSuccess: (res: ApiResponse<PostReactions>) => {
      queryClient.setQueryData(reactionKeys.byPost(postId), res);
    },
  });
}
