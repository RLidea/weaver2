export const permissionGroupKeys = {
  all: ['admin', 'permissions', 'groups'] as const,
  detail: (id: string) => ['admin', 'permissions', 'groups', id] as const,
  users: (id: string) => ['admin', 'permissions', 'groups', id, 'users'] as const,
} as const;
