export const userKeys = {
  profile: (username: string) => ['user', 'profile', username] as const,
} as const;
