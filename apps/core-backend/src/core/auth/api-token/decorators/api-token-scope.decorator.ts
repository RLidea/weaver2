import { SetMetadata } from '@nestjs/common';

export const API_TOKEN_SCOPE_KEY = 'apiTokenScope';
export const ANY_SESSION_USER_KEY = 'anySessionUser';

/**
 * 이 경로를 범위 토큰에 연다. 그 범위를 가진 토큰만 통과한다(없으면 403).
 * 이 데코레이터가 없는 경로에서 토큰은 인증 수단이 아니다(401).
 *
 * 범위 경로에는 `@RequirePermission` 을 **함께** 붙인다. 두 데코레이터는 각자 자기 호출자만 맡는다:
 * - 토큰: 이 범위가 `@RequirePermission` 을 대신한다. 주인의 권한은 `@RequirePermission` 을
 *   결코 채우지 못한다 — 경로 자신의 범위만 그 자리에 선다(PermissionGuard)
 * - 세션: 지금처럼 `@RequirePermission` 의 권한이 있어야 한다
 * 세션 쪽을 로그인한 누구에게나 열려면 `@RequirePermission` 대신 `@AnySessionUser()` 를 붙여 뜻을 밝힌다.
 * 둘 다 없으면 route-guard-coverage 시험이 깨진다.
 *
 * 핸들러에만 붙는다(클래스에 붙이면 컴파일되지 않고, 가드도 핸들러만 본다).
 *
 * @example
 * @ApiTokenScope('blog:draft')
 * @RequirePermission(PERMISSIONS.BOARD.MANAGE)
 */
export const ApiTokenScope = (scope: string): MethodDecorator =>
  SetMetadata(API_TOKEN_SCOPE_KEY, scope);

/**
 * 범위 경로의 세션 쪽을 로그인한 누구에게나 연다는 표시. 동작은 바꾸지 않는다 —
 * `@RequirePermission` 이 빠진 것이 실수가 아니라 뜻이라는 것을 route-guard-coverage 에 알린다.
 */
export const AnySessionUser = (): MethodDecorator =>
  SetMetadata(ANY_SESSION_USER_KEY, true);
