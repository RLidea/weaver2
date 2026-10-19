/**
 * 로그인 방식 — `AUTH_MODE=local|sso` (기본 `local`).
 *
 * `sso` 면 웹 로그인을 바깥 OIDC 발급자(RLidea 에서는 accounts.rlidea.com)에 맡긴다. 로컬 로그인 ·
 * 가입 · 재설정 · 2FA · OAuth 경로는 `@LocalAuthOnly()` 로 404 가 되고, 콜백이 끝나면 지금과 같은
 * 세션 쿠키를 준다. 되돌리기는 값 하나(`AUTH_MODE=local`)와 재시작이다.
 *
 * 손님 설정은 `ACCOUNTS_OIDC_*` 를 읽는다. `OIDC_*` 는 **공급자** 쪽(oidc-provider 를 띄우는 파생
 * 프로젝트)이 이미 쓰는 이름이라 겹치지 않게 했다. 값이 틀리면 부팅을 멈춘다 — 조용히 local 로
 * 넘어가면 운영에서 닫았다고 믿은 비밀번호 로그인이 열린 채로 돈다.
 */
export type AuthMode = 'local' | 'sso';

export interface SsoConfig {
  /** 안내판의 `issuer` 와 글자까지 같아야 한다 */
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  /** 계정 화면에서 비밀번호 · 2FA 를 고치러 가는 accounts 주소. 없으면 링크를 그리지 않는다 */
  accountUrl?: string;
  /** `lang` 으로 받을 값. 첫 값이 기본이다 */
  langs: string[];
  /** 입구(`entry`) → 실패 주소(같은 출처의 경로, `{lang}` 자리표시자 가능). 쓴 순서를 지킨다 */
  failureUrls: [string, string][];
  /** `next` 가 없거나 다른 출처일 때 갈 곳 */
  defaultNext: string;
}

export type AuthModeConfig =
  { mode: 'local'; sso?: undefined } | { mode: 'sso'; sso: SsoConfig };

/** 전역 제공 토큰 — AuthModeModule 이 내준다 */
export const AUTH_MODE_CONFIG = Symbol('AUTH_MODE_CONFIG');

const REQUIRED_SSO_KEYS = [
  'ACCOUNTS_OIDC_ISSUER',
  'ACCOUNTS_OIDC_CLIENT_ID',
  'ACCOUNTS_OIDC_CLIENT_SECRET',
] as const;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * 발급자 주소에 평문 http 를 허락하나 — 같은 기계(loopback)일 때만. 시험 · e2e 의 가짜 발급자와
 * 로컬 accounts 가 여기 든다. 운영 발급자는 https 라 이 갈래에 들 수 없다.
 */
export function isLoopbackHttp(url: string): boolean {
  const parsed = new URL(url);
  return parsed.protocol === 'http:' && LOOPBACK_HOSTS.has(parsed.hostname);
}

/**
 * 같은 출처의 경로로 풀어 돌려준다. 아니면 null.
 *
 * 「가짜 출처」로 풀어 출처를 비교한다 — `//evil` · `/\evil` · `/\t/evil` 은 다른 출처라 떨어진다.
 * 그것만으로는 모자라다: `/.//evil.com` · `/a/..//evil.com` · `/%2e//evil.com` 은 출처는 같지만
 * **점 마디를 풀고 나면** pathname 이 `//evil.com` 이 되고, 그 값을 Location 에 실으면 브라우저는
 * 프로토콜 상대 주소(다른 사이트)로 읽는다. 그래서 풀린 결과가 `/` 로 시작하되 `//` · `/\` 로
 * 시작하지 않는지 한 번 더 본다.
 */
export function normalizeSameOriginPath(value: string): string | null {
  const base = 'http://same-origin.invalid';
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return null;
    const out = `${url.pathname}${url.search}${url.hash}`;
    return out.startsWith('/') &&
      !out.startsWith('//') &&
      !out.startsWith('/\\')
      ? out
      : null;
  } catch {
    return null;
  }
}

/** 설정값이 같은 출처의 경로인가 — `/` 로 시작하고, 풀어도 같은 출처의 경로다 */
function isSameOriginPath(value: string): boolean {
  return value.startsWith('/') && normalizeSameOriginPath(value) !== null;
}

/** `{"admin":"/login"}` 또는 `admin=/login,site=/{lang}/account/sign-in/` */
function parseFailureUrls(raw: string): [string, string][] {
  const trimmed = raw.trim();
  let entries: [string, string][];
  if (trimmed.startsWith('{')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error('ACCOUNTS_OIDC_FAILURE_URLS is not valid JSON');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('ACCOUNTS_OIDC_FAILURE_URLS must be an object');
    }
    entries = Object.entries(parsed as Record<string, unknown>).map(
      ([k, v]) => [k, String(v)],
    );
  } else {
    entries = trimmed
      .split(',')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const eq = pair.indexOf('=');
        if (eq <= 0) {
          throw new Error(
            'ACCOUNTS_OIDC_FAILURE_URLS entries must look like entry=/path',
          );
        }
        return [pair.slice(0, eq).trim(), pair.slice(eq + 1).trim()];
      });
  }
  if (entries.length === 0) {
    throw new Error('ACCOUNTS_OIDC_FAILURE_URLS is empty');
  }
  for (const [entry, path] of entries) {
    if (!/^[a-z][a-z0-9_-]*$/i.test(entry)) {
      throw new Error(
        `ACCOUNTS_OIDC_FAILURE_URLS has a bad entry name: ${entry}`,
      );
    }
    if (!isSameOriginPath(path)) {
      throw new Error(
        `ACCOUNTS_OIDC_FAILURE_URLS.${entry} must be a same-origin path`,
      );
    }
  }
  return entries;
}

/**
 * 환경 변수에서 로그인 방식을 읽는다. 틀린 값은 던진다(부팅이 멈춘다). 오류 메시지에는 칸 이름만
 * 싣고 값은 싣지 않는다 — 비밀이 로그에 남지 않게.
 */
export function readAuthModeConfig(
  get: (key: string) => string | undefined,
): AuthModeConfig {
  const value = (key: string) => {
    const v = get(key)?.trim();
    return v ? v : undefined;
  };

  const mode = value('AUTH_MODE') ?? 'local';
  if (mode === 'local') return { mode: 'local' };
  if (mode !== 'sso') {
    throw new Error('AUTH_MODE must be "local" or "sso"');
  }

  const missing = REQUIRED_SSO_KEYS.filter((key) => !value(key));
  if (missing.length > 0) {
    throw new Error(`AUTH_MODE=sso requires ${missing.join(', ')}`);
  }
  const issuer = value('ACCOUNTS_OIDC_ISSUER')!;
  let issuerUrl: URL;
  try {
    issuerUrl = new URL(issuer);
  } catch {
    throw new Error('ACCOUNTS_OIDC_ISSUER is not a URL');
  }
  if (issuerUrl.protocol !== 'https:' && !isLoopbackHttp(issuer)) {
    throw new Error(
      'ACCOUNTS_OIDC_ISSUER must be https (plain http only for localhost)',
    );
  }

  const clientUrl = value('CLIENT_URL')?.replace(/\/+$/, '');
  const redirectUri =
    value('ACCOUNTS_OIDC_REDIRECT_URI') ??
    (clientUrl ? `${clientUrl}/api/v1/auth/oidc/callback` : undefined);
  const postLogoutRedirectUri =
    value('ACCOUNTS_OIDC_POST_LOGOUT_REDIRECT_URI') ??
    (clientUrl ? `${clientUrl}/` : undefined);
  if (!redirectUri || !postLogoutRedirectUri) {
    throw new Error(
      'AUTH_MODE=sso requires CLIENT_URL (or ACCOUNTS_OIDC_REDIRECT_URI and ACCOUNTS_OIDC_POST_LOGOUT_REDIRECT_URI)',
    );
  }

  const langs = (value('ACCOUNTS_OIDC_LANGS') ?? 'ko')
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
  if (
    langs.length === 0 ||
    langs.some((l) => !/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(l))
  ) {
    throw new Error('ACCOUNTS_OIDC_LANGS must be a comma list like ko,en,ja');
  }

  // 화면이 새 탭 링크로 그린다 — javascript: · 평문 http 원격 주소가 끼지 않게
  const accountUrl = value('ACCOUNTS_OIDC_ACCOUNT_URL');
  if (accountUrl) {
    let parsed: URL | undefined;
    try {
      parsed = new URL(accountUrl);
    } catch {
      parsed = undefined;
    }
    if (
      !parsed ||
      (parsed.protocol !== 'https:' && !isLoopbackHttp(accountUrl))
    ) {
      throw new Error(
        'ACCOUNTS_OIDC_ACCOUNT_URL must be https (plain http only for localhost)',
      );
    }
  }

  const defaultNext = value('ACCOUNTS_OIDC_DEFAULT_NEXT') ?? '/dashboard';
  if (!isSameOriginPath(defaultNext)) {
    throw new Error('ACCOUNTS_OIDC_DEFAULT_NEXT must be a same-origin path');
  }

  return {
    mode: 'sso',
    sso: {
      issuer,
      clientId: value('ACCOUNTS_OIDC_CLIENT_ID')!,
      clientSecret: value('ACCOUNTS_OIDC_CLIENT_SECRET')!,
      redirectUri,
      postLogoutRedirectUri,
      accountUrl,
      langs,
      failureUrls: parseFailureUrls(
        value('ACCOUNTS_OIDC_FAILURE_URLS') ?? 'admin=/login',
      ),
      defaultNext,
    },
  };
}
