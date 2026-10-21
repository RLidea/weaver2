import { Prisma } from '@weaver2/prisma';

/** 응답에 싣는 칸 — tokenHash 는 여기 없다. 해시도 밖으로 내보내지 않는다 */
export const API_TOKEN_SELECT = {
  id: true,
  name: true,
  prefix: true,
  scopes: true,
  lastUsedAt: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  user: { select: { id: true, username: true, displayName: true } },
} satisfies Prisma.ApiTokenSelect;
