export const boardKeys = {
  lists: ['boards'] as const,
  detail: (id: string) => ['boards', id] as const,
  posts: (boardId: string) => ['boards', boardId, 'posts'] as const,
} as const;

export const postKeys = {
  lists: (params?: object) => ['posts', 'list', params] as const,
  detail: (id: string) => ['posts', id] as const,
  byUser: (userId: string) => ['posts', 'user', userId] as const,
} as const;

export const commentKeys = {
  byPost: (postId: string) => ['comments', postId] as const,
} as const;

export const reactionKeys = {
  byPost: (postId: string) => ['reactions', postId] as const,
} as const;

export const emojiKeys = {
  all: ['emojis'] as const,
} as const;
