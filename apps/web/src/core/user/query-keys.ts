export const userKeys = {
  me: ['user', 'me'] as const,
  profile: (username: string) => ['user', 'profile', username] as const,
} as const;
