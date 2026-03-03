export const adminBoardKeys = {
  all: ['admin', 'boards'] as const,
  detail: (id: string) => ['admin', 'boards', id] as const,
  permissions: (id: string) => ['admin', 'boards', id, 'permissions'] as const,
} as const;
