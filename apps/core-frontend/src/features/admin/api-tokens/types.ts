import type { components } from '@weaver2/api-client/schema';

/**
 * 백엔드 DTO에서 파생된 타입 (openapi:types로 생성된 api-schema.d.ts 참조).
 * 백엔드 DTO를 바꾸면 `pnpm openapi:types`로 재생성하면 여기서 자동 반영된다 — 손으로 미러링하지 말 것.
 */
export type ApiToken = components['schemas']['ApiTokenDto'];
export type IssuedApiToken = components['schemas']['IssuedApiTokenDto'];
export type CreateApiTokenRequest = components['schemas']['CreateApiTokenDto'];

/** 프론트 계산용 — 목록의 상태 칸 */
export type ApiTokenStatus = 'active' | 'expired' | 'revoked';
