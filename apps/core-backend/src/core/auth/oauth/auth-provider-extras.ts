/**
 * `GET /v1/auth/providers` 응답에 파생 프로젝트가 칸을 더하는 자리.
 *
 * 파생 프로젝트는 전역 모듈에서 이 토큰으로 함수 목록을 내준다. 각 함수가 돌려준 칸이
 * 응답에 더해지되, upstream 의 칸(password·google·…)은 덮어쓰지 못한다.
 *
 * @example
 * ```ts
 * @Global()
 * @Module({
 *   providers: [{
 *     provide: AUTH_PROVIDER_EXTRAS,
 *     useFactory: (config: ConfigService): AuthProviderExtra[] => [
 *       () => ({ emailCode: config.get('EMAIL_CODE_LOGIN_ENABLED') === 'true' }),
 *     ],
 *     inject: [ConfigService],
 *   }],
 *   exports: [AUTH_PROVIDER_EXTRAS],
 * })
 * export class AuthProviderExtrasModule {}
 * ```
 */
export const AUTH_PROVIDER_EXTRAS = Symbol('AUTH_PROVIDER_EXTRAS');

export type AuthProviderExtra = () => Record<string, boolean>;
