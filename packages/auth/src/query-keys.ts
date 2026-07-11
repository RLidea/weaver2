export const authKeys = {
  /** 세션 정체성(useMe) 키 — 값은 기존 ['user','me']를 유지해 이전 invalidation과 호환 */
  me: ['user', 'me'] as const,
  sessions: ['auth', 'sessions'] as const,
  twoFactorStatus: ['auth', '2fa', 'status'] as const,
  oauthConnections: ['auth', 'oauth', 'connections'] as const,
} as const;
