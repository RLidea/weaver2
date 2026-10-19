import {
  isLoopbackHttp,
  normalizeSameOriginPath,
  readAuthModeConfig,
} from './auth-mode';

const SSO = {
  AUTH_MODE: 'sso',
  ACCOUNTS_OIDC_ISSUER: 'https://accounts.example.com/oidc',
  ACCOUNTS_OIDC_CLIENT_ID: 'app',
  ACCOUNTS_OIDC_CLIENT_SECRET: 'top-secret-value',
  CLIENT_URL: 'https://app.example.com',
};

const read = (env: Record<string, string | undefined>) =>
  readAuthModeConfig((key) => env[key]);

describe('readAuthModeConfig', () => {
  it('값이 없으면 local', () => {
    expect(read({})).toEqual({ mode: 'local' });
    expect(read({ AUTH_MODE: '  ' })).toEqual({ mode: 'local' });
  });

  it('엉뚱한 값이면 던진다 — 조용히 local 로 넘어가지 않는다', () => {
    expect(() => read({ AUTH_MODE: 'SSO' })).toThrow('AUTH_MODE');
    expect(() => read({ AUTH_MODE: 'oidc' })).toThrow('AUTH_MODE');
  });

  it.each([
    'ACCOUNTS_OIDC_ISSUER',
    'ACCOUNTS_OIDC_CLIENT_ID',
    'ACCOUNTS_OIDC_CLIENT_SECRET',
  ])('sso 인데 %s 가 비면 던진다 — 칸 이름만 싣고 값은 싣지 않는다', (key) => {
    let message = '';
    try {
      read({ ...SSO, [key]: '' });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain(key);
    expect(message).not.toContain('top-secret-value');
  });

  it('redirect · post_logout 기본값은 CLIENT_URL 에서 나온다', () => {
    const config = read({ ...SSO, CLIENT_URL: 'https://app.example.com/' });
    expect(config.sso).toMatchObject({
      redirectUri: 'https://app.example.com/api/v1/auth/oidc/callback',
      postLogoutRedirectUri: 'https://app.example.com/',
      langs: ['ko'],
      failureUrls: [['admin', '/login']],
      defaultNext: '/dashboard',
      accountUrl: undefined,
    });
  });

  it('설정한 redirect · post_logout · 언어 · 실패 주소 · 기본 next 를 그대로 쓴다', () => {
    const config = read({
      ...SSO,
      ACCOUNTS_OIDC_REDIRECT_URI: 'https://x.example.com/cb',
      ACCOUNTS_OIDC_POST_LOGOUT_REDIRECT_URI: 'https://x.example.com/bye',
      ACCOUNTS_OIDC_ACCOUNT_URL: 'https://accounts.example.com/me',
      ACCOUNTS_OIDC_LANGS: 'ko, en ,ja',
      ACCOUNTS_OIDC_FAILURE_URLS: 'admin=/login,site=/{lang}/account/sign-in/',
      ACCOUNTS_OIDC_DEFAULT_NEXT: '/ko/account/',
    });
    expect(config.sso).toMatchObject({
      redirectUri: 'https://x.example.com/cb',
      postLogoutRedirectUri: 'https://x.example.com/bye',
      accountUrl: 'https://accounts.example.com/me',
      langs: ['ko', 'en', 'ja'],
      failureUrls: [
        ['admin', '/login'],
        ['site', '/{lang}/account/sign-in/'],
      ],
      defaultNext: '/ko/account/',
    });
  });

  it('실패 주소는 JSON 으로도 받는다', () => {
    const config = read({
      ...SSO,
      ACCOUNTS_OIDC_FAILURE_URLS: '{"site":"/{lang}/sign-in","admin":"/login"}',
    });
    expect(config.sso?.failureUrls).toEqual([
      ['site', '/{lang}/sign-in'],
      ['admin', '/login'],
    ]);
  });

  it.each([
    'admin=https://evil.com',
    'admin=//evil.com',
    'admin=/\\evil.com',
    'nope',
  ])('실패 주소가 같은 출처의 경로가 아니면 던진다: %s', (raw) => {
    expect(() => read({ ...SSO, ACCOUNTS_OIDC_FAILURE_URLS: raw })).toThrow(
      'ACCOUNTS_OIDC_FAILURE_URLS',
    );
  });

  it('기본 next 가 다른 출처면 던진다', () => {
    expect(() =>
      read({ ...SSO, ACCOUNTS_OIDC_DEFAULT_NEXT: '//evil.com' }),
    ).toThrow('ACCOUNTS_OIDC_DEFAULT_NEXT');
  });

  it('CLIENT_URL 도 redirect 도 없으면 던진다', () => {
    expect(() => read({ ...SSO, CLIENT_URL: undefined })).toThrow('CLIENT_URL');
  });

  it('발급자는 https — 평문 http 는 localhost 만', () => {
    expect(() =>
      read({
        ...SSO,
        ACCOUNTS_OIDC_ISSUER: 'http://accounts.example.com/oidc',
      }),
    ).toThrow('https');
    expect(
      read({ ...SSO, ACCOUNTS_OIDC_ISSUER: 'http://localhost:4180/oidc' }).mode,
    ).toBe('sso');
    expect(
      read({ ...SSO, ACCOUNTS_OIDC_ISSUER: 'http://127.0.0.1:3100/oidc' }).mode,
    ).toBe('sso');
  });
});

describe('ACCOUNTS_OIDC_ACCOUNT_URL', () => {
  it.each([
    'javascript:alert(1)',
    'http://accounts.example.com/account',
    'not a url',
    'ftp://accounts.example.com/',
  ])('%s → 던진다', (url) => {
    expect(() => read({ ...SSO, ACCOUNTS_OIDC_ACCOUNT_URL: url })).toThrow(
      'ACCOUNTS_OIDC_ACCOUNT_URL',
    );
  });

  it('https · localhost http 는 받는다', () => {
    for (const url of [
      'https://accounts.example.com/account',
      'http://127.0.0.1:4100/account',
    ]) {
      expect(
        read({ ...SSO, ACCOUNTS_OIDC_ACCOUNT_URL: url }).sso?.accountUrl,
      ).toBe(url);
    }
  });
});

describe('normalizeSameOriginPath', () => {
  it('같은 출처의 경로는 풀린 꼴로 돌려준다', () => {
    expect(normalizeSameOriginPath('/admin/users?tab=a#x')).toBe(
      '/admin/users?tab=a#x',
    );
    expect(normalizeSameOriginPath('/a/../b')).toBe('/b');
    // 탭은 URL 파서가 지운다 — 같은 출처의 경로라 위험하지 않다
    expect(normalizeSameOriginPath('/\tevil.com')).toBe('/evil.com');
  });

  it.each([
    '//evil.com',
    'https://evil.com',
    '/\t/evil.com',
    '\\\\evil.com',
    '/\\evil.com',
    '/.//evil.com',
    '/..//evil.com',
    '/%2e//evil.com',
    '/a/..//evil.com',
    '/x/../\\evil.com',
    '/./\\evil.com',
  ])('%j → null (다른 출처 · 점 마디를 풀면 //)', (value) => {
    expect(normalizeSameOriginPath(value)).toBeNull();
  });

  it('설정의 실패 주소 · 기본 next 도 같은 규칙으로 거른다', () => {
    expect(() =>
      read({ ...SSO, ACCOUNTS_OIDC_FAILURE_URLS: 'admin=/.//evil.com' }),
    ).toThrow('ACCOUNTS_OIDC_FAILURE_URLS');
    expect(() =>
      read({ ...SSO, ACCOUNTS_OIDC_DEFAULT_NEXT: '/a/..//evil.com' }),
    ).toThrow('ACCOUNTS_OIDC_DEFAULT_NEXT');
  });
});

describe('isLoopbackHttp', () => {
  it('http + loopback 만 참', () => {
    expect(isLoopbackHttp('http://localhost:4180/oidc')).toBe(true);
    expect(isLoopbackHttp('http://127.0.0.1:3100')).toBe(true);
    expect(isLoopbackHttp('http://[::1]:3100')).toBe(true);
    expect(isLoopbackHttp('https://localhost/oidc')).toBe(false);
    expect(isLoopbackHttp('http://localhost.evil.com/')).toBe(false);
    expect(isLoopbackHttp('http://accounts.example.com')).toBe(false);
  });
});
