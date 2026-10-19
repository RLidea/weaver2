import { Logger } from '@nestjs/common';

/**
 * SSO 로그인 · 잇기에 파생 프로젝트가 덧붙이는 자리 (`AUTH_PROVIDER_EXTRAS` ·
 * `USER_WITHDRAWAL_HOOKS` 처럼 전역 모듈에서 이 토큰으로 내준다). 모든 칸은 고를 수 있다.
 *
 * **훅이 던져도 로그인 · 잇기는 실패하지 않는다** — 경고 로그만 남는다. 기록(인증 사건) ·
 * 권리 붙이기처럼 「되면 좋은」 일을 거는 곳이지, 로그인을 막는 문이 아니다.
 * 훅마다 **`OIDC_HOOK_TIMEOUT_MS`(3초)** 까지만 기다린다 — 걸린 훅이 콜백을 붙잡지 못한다. 시간을
 * 넘긴 훅은 뒤에서 계속 돌 수 있지만 로그인은 기다리지 않는다(`names` 는 기본 생성기로 넘어간다).
 *
 * 그래서 훅은 **멱등**이어야 하고, 쓰기는 **트랜잭션 하나**로 한다 — 시간을 넘긴 훅은 끊기지도 되돌려지지도
 * 않고 뒤에서 끝까지(또는 반쯤) 돈다. 같은 로그인이 다시 오면 같은 훅이 또 불린다.
 * ⚠ `pnpm sso:link` · `sso:unlink` 에서는 훅이 시간을 넘기면 스크립트가 `app.close()` 로 Prisma 연결을
 * 닫는다 — 아직 돌던 훅의 쓰기가 연결을 잃고 실패할 수 있다. 기록이 빠졌으면 다시 돌린다(멱등이라 안전).
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
 *       onBackchannelLogout: async (userId, { sid }) => {
 *         if (userId) await events.record(userId, 'SSO_BACKCHANNEL_LOGOUT', { sid });
 *       },
 *     }),
 *     inject: [AuthEventService],
 *   }],
 *   exports: [OIDC_USER_HOOKS],
 * })
 * export class OidcUserHooksModule {}
 * ```
 */
export const OIDC_USER_HOOKS = Symbol('OIDC_USER_HOOKS');

/** 훅 하나를 기다리는 한도 */
export const OIDC_HOOK_TIMEOUT_MS = 3_000;

/**
 * 훅을 부르고 한도까지만 기다린다. 던지거나 한도를 넘기면 경고 로그만 남기고 `undefined` —
 * 부른 쪽(로그인 · 잇기)은 실패하지 않는다.
 */
export async function runOidcHook<T>(
  logger: Pick<Logger, 'warn'>,
  name: string,
  fn: (() => T | Promise<T>) | undefined,
  timeoutMs = OIDC_HOOK_TIMEOUT_MS,
): Promise<T | undefined> {
  if (!fn) return undefined;
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([Promise.resolve().then(fn), timeout]);
  } catch (err) {
    logger.warn(`OIDC_USER_HOOKS.${name} failed: ${(err as Error).message}`);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** userinfo 에서 받은 것 (OIDC 클레임 이름 그대로) — 이메일은 로그에 남기지 않는다(추적은 sub 로) */
export interface OidcUserClaims {
  sub: string;
  email?: string;
  email_verified: boolean;
  name?: string;
  preferred_username?: string;
}

export interface OidcSignInMeta {
  sub: string;
  /** 이번 로그인에서 새 행을 만들었나 */
  created: boolean;
  /** start 의 `lang` (ACCOUNTS_OIDC_LANGS 중 하나) — 새 사람의 언어를 정할 때 쓴다 */
  lang: string;
  /** start 의 `entry` (실패 주소 표의 열쇠) */
  entry: string;
  ip?: string;
  /** Cloudflare 뒤일 때만 — `cf-ipcountry` 헤더. 기록용(위조될 수 있다) */
  country?: string;
  userAgent?: string;
}

/** back-channel 로그아웃에 실려 온 것 — sid · sub 중 하나 이상 */
export interface OidcBackchannelLogoutMeta {
  sid?: string;
  sub?: string;
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
  /**
   * 모르는 sub 인데 같은 이메일의 행이 있어 멈췄다(`sso_conflict`). userId 는 그 행.
   * **기록 전용이다.** 여기서 `ssoSubject` 를 쓰거나 행을 이어서는 안 된다 — 그러면 이메일 자동 잇기
   * (계정 탈취 경로, Q12)가 훅으로 되살아난다. 잇기는 사람이 대조한 뒤 `pnpm sso:link` 로만 한다.
   */
  onConflict?(
    userId: string,
    sub: string,
    meta: OidcSignInMeta,
  ): Promise<void> | void;
  /** 운영자가 `pnpm sso:link --apply` 로 이었다 */
  onLink?(userId: string, sub: string): Promise<void> | void;
  /** 운영자가 `pnpm sso:unlink --apply` 로 풀었다 */
  onUnlink?(userId: string, sub: string): Promise<void> | void;
  /**
   * 발급자가 back-channel 로그아웃을 보냈고 세션을 지웠다. 응답(200)을 보낸 **뒤에** 불린다.
   * userId 는 지운 세션의 주인 — 없으면 sub 로 찾은 사람, 그것도 없으면 null(지울 것이 없었다).
   * **멱등이어야 한다** — 같은 로그아웃이 두 번 올 수 있다. 발급자는 다시 보낼 때마다 새로 서명하므로(새 jti)
   * 첫 응답이 늦어 다시 보낸 것은 jti 로 걸러지지 않는다. 같은 사람의 다른 sid 로도 여러 번 온다
   */
  onBackchannelLogout?(
    userId: string | null,
    logout: OidcBackchannelLogoutMeta,
  ): Promise<void> | void;
}
