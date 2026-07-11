import { apiClient } from '@weaver2/api-client';
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  PostReactions,
} from '../types';

export const commentApi = {
  getByPost: (postId: string) =>
    apiClient.get<Comment[]>(`/v1/comments?postId=${postId}`),

  create: (body: CreateCommentRequest) =>
    apiClient.post<Comment>('/v1/comments', body),

  update: (commentId: string, body: UpdateCommentRequest) =>
    apiClient.patch<Comment>(`/v1/comments/${commentId}`, body),

  delete: (commentId: string) =>
    apiClient.delete<void>(`/v1/comments/${commentId}`),

  getReactions: (postId: string) =>
    apiClient.get<PostReactions>(`/v1/posts/${postId}/reactions`),

  addReaction: (postId: string, emojiId: string) =>
    apiClient.post<PostReactions>(`/v1/posts/${postId}/reactions`, { emojiId }),

  removeReaction: (postId: string, emojiId: string) =>
    apiClient.delete<PostReactions>(`/v1/posts/${postId}/reactions/${emojiId}`),
};
