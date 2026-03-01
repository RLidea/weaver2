import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commentApi } from '../api/comment.api';
import { commentKeys } from '../query-keys';
import type { CreateCommentRequest, UpdateCommentRequest } from '../types';

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: CreateCommentRequest) => commentApi.create(req),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.byPost(res.data.postId) });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: UpdateCommentRequest }) =>
      commentApi.update(commentId, body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.byPost(res.data.postId) });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, postId }: { commentId: string; postId: string }) =>
      commentApi.delete(commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.byPost(variables.postId) });
    },
  });
}
