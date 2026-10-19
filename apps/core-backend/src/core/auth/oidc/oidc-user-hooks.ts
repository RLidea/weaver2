/**
 * SSO 로그인 · 잇기에 파생 프로젝트가 덧붙이는 자리 (`AUTH_PROVIDER_EXTRAS` ·
 * `USER_WITHDRAWAL_HOOKS` 처럼 전역 모듈에서 이 토큰으로 내준다). 모든 칸은 고를 수 있다.
 *
 * **훅이 던져도 로그인 · 잇기는 실패하지 않는다** — 경고 로그만 남는다. 기록(인증 사건) ·
 * 권리 붙이기처럼 「되면 좋은」 일을 거는 곳이지, 로그인을 막는 문이 아니다.
 *
 * @example
 * ```ts
 * @Global()
 * @Module({
 *   providers: [{
 *     provide: OIDC_USER_HOOKS,
 *     useFactory: (events: AuthEventService): OidcUserHooks => ({
 *       afterSignIn: (userId, meta) => events.record(userId, 'LOGIN', meta),
 *       onConflict: (userId, sub) => events.record(userId, 'SSO_CONFLICT', { sub }),
 *       onLink: (userId, sub) => events.record(userId, 'SSO_LINK', { sub }),
 *     }),
 *     inject: [AuthEventService],
 *   }],
 *   exports: [OIDC_USER_HOOKS],
 * })
 * export class OidcUserHooksModule {}
 * ```
 */
export const OIDC_USER_HOOKS = Symbol('OIDC_USER_HOOKS');

/** userinfo 에서 받은 것 — 이메일은 로그에 남기지 않는다(추적은 sub 로) */
export interface OidcUserClaims {
  sub: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  preferredUsername?: string;
}

export interface OidcSignInMeta {
  sub: string;
  /** 이번 로그인에서 새 행을 만들었나 */
  created: boolean;
  /** start 의 `lang` (ACCOUNTS_OIDC_LANGS 중 하나) — 새 사람의 언어를 정할 때 쓴다 */
  lang: string;
  /** start 의 `entry` (실패 주소 표의 열쇠) */
  entry: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface OidcUserHooks {
  /** 새 사람의 username · displayName. 없거나 던지면 weaver2 기본 생성기를 쓴다 */
  names?(
    claims: OidcUserClaims,
  ):
    | Promise<{ username: string; displayName: string }>
    | { username: string; displayName: string };
  /** 세션을 준 뒤 */
  afterSignIn?(userId: string, meta: OidcSignInMeta): Promise<void> | void;
  /** 모르는 sub 인데 같은 이메일의 행이 있어 멈췄다(`sso_conflict`). userId 는 그 행 */
  onConflict?(
    userId: string,
    sub: string,
    meta: OidcSignInMeta,
  ): Promise<void> | void;
  /** 운영자가 `pnpm sso:link --apply` 로 이었다 */
  onLink?(userId: string, sub: string): Promise<void> | void;
  /** 운영자가 `pnpm sso:unlink --apply` 로 풀었다 */
  onUnlink?(userId: string, sub: string): Promise<void> | void;
}
