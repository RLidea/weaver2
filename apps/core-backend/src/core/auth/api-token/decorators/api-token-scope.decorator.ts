import { SetMetadata } from '@nestjs/common';

export const API_TOKEN_SCOPE_KEY = 'apiTokenScope';

/**
 * 이 경로를 범위 토큰에 연다. 그 범위를 가진 토큰만 통과한다(없으면 403).
 * 이 데코레이터가 없는 경로에서 토큰은 인증 수단이 아니다(401).
 *
 * 🔴 세션 쪽은 그대로다 — 이 데코레이터만 붙이면 **로그인한 모든 세션 사용자에게도** 열린다.
 *    `@RequirePermission` 을 함께 붙이면 세션 전용이 된다(토큰 주체는 그 데코레이터를 통과하지 못한다).
 *    세션 관리자와 토큰이 같은 경로를 쓰게 하려면 핸들러에서 `@Actor()` 의 `kind` 로 가른다.
 *
 * @example @ApiTokenScope('blog:draft')
 */
export const ApiTokenScope = (scope: string) =>
  SetMetadata(API_TOKEN_SCOPE_KEY, scope);
