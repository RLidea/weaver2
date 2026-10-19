/**
 * `AUTH_MODE=sso` 에서도 열려 있어도 되는 **공개(`@Public`) 쓰기 경로**의 목록.
 *
 * 공개 쓰기 경로는 로그인 없이 상태를 바꾸는 입구다. sso 로 바꾸면서 비밀번호 로그인 · 가입 ·
 * 재설정 · 2FA · OAuth 를 닫았는데, 그 밖에 새로 생긴 공개 쓰기 경로가 슬쩍 신원을 다루면
 * 닫은 것이 소용없다. 그래서 `public-write-routes.integration.spec.ts` 가 앱의 모든 공개 쓰기
 * 경로를 메타데이터에서 모아, 각 경로가 **이 목록에 있거나 sso 에서 404 `AUTH_MODE_SSO`** 인지
 * 잰다. 목록에 없는 새 경로가 생기면 그 시험이 빨개진다 — 여기 더할지, `@LocalAuthOnly()` 를
 * 붙일지 정하라는 뜻이다.
 *
 * 형식은 `METHOD /v1/경로`. 경로 변수는 `:이름` 으로 쓴다(아무 한 마디와 맞는다).
 */
export const PUBLIC_WRITE_ALLOWLIST: readonly string[] = [
  // 세션 갱신 · 로그아웃 — SSO 로 받은 세션도 같은 쿠키다
  'POST /v1/auth/refresh',
  'POST /v1/auth/sign-out',
  // OIDC back-channel 로그아웃 — 발급자가 서명한 logout_token 으로만 세션을 지운다(@SsoOnly)
  'POST /v1/auth/oidc/backchannel-logout',
  // 게시판 쓰기 — 익명 허용 여부는 게시판 권한이 판정한다
  'POST /v1/posts',
  'POST /v1/comments',
  // 방문 기록 — 신원을 다루지 않는다
  'POST /v1/analytics/tracking/page-view',
  'POST /v1/analytics/tracking/bulk-page-views',
];

/**
 * 파생 프로젝트가 허용 목록을 더하는 자리. 전역 모듈에서 이 토큰으로 문자열 배열을 내준다
 * (`AUTH_PROVIDER_EXTRAS` 와 같은 방식). 시험은 `PUBLIC_WRITE_ALLOWLIST` 와 이것을 합쳐 본다.
 *
 * @example
 * ```ts
 * @Global()
 * @Module({
 *   providers: [{
 *     provide: PUBLIC_WRITE_ALLOWLIST_EXTRAS,
 *     useValue: ['POST /v1/app/auth/refresh', 'POST /v1/webhooks/polar'],
 *   }],
 *   exports: [PUBLIC_WRITE_ALLOWLIST_EXTRAS],
 * })
 * export class PublicWriteAllowlistModule {}
 * ```
 */
export const PUBLIC_WRITE_ALLOWLIST_EXTRAS = Symbol(
  'PUBLIC_WRITE_ALLOWLIST_EXTRAS',
);

/** `METHOD /path` 가 목록의 한 줄과 맞나. `:이름` 은 한 마디와 맞는다 */
export function isAllowlisted(
  allowlist: readonly string[],
  method: string,
  path: string,
): boolean {
  const target = `${method.toUpperCase()} ${path}`;
  return allowlist.some((entry) => {
    const pattern = entry
      .split(/(:[A-Za-z0-9_]+)/)
      .map((part) =>
        part.startsWith(':')
          ? '[^/]+'
          : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      )
      .join('');
    return new RegExp(`^${pattern}$`).test(target);
  });
}
