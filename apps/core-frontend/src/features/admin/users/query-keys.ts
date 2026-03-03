import type { AdminUsersParams } from './types';

export const adminUserKeys = {
  all: ['admin', 'users'] as const,
  lists: (params?: AdminUsersParams) => ['admin', 'users', 'list', params] as const,
  detail: (id: string) => ['admin', 'users', id] as const,
} as const;
