export const authKeys = {
  sessions: ['auth', 'sessions'] as const,
  twoFactorStatus: ['auth', '2fa', 'status'] as const,
  oauthConnections: ['auth', 'oauth', 'connections'] as const,
} as const;
