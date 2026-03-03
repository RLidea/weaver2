import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postApi } from '../api/post.api';
import { boardKeys, postKeys } from '../query-keys';
import type { CreatePostRequest, UpdatePostRequest } from '../types';

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: CreatePostRequest) => postApi.create(req),
    onSuccess: (res) => {
      const boardId = res.data.boardId;
      queryClient.invalidateQueries({ queryKey: boardKeys.posts(boardId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, body }: { postId: string; body: UpdatePostRequest }) =>
      postApi.update(postId, body),
    onSuccess: (res) => {
      const { id, boardId } = res.data;
      queryClient.invalidateQueries({ queryKey: postKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: boardKeys.posts(boardId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId }: { postId: string; boardId: string }) =>
      postApi.delete(postId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(variables.postId) });
      queryClient.invalidateQueries({ queryKey: boardKeys.posts(variables.boardId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
