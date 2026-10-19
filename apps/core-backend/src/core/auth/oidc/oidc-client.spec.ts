import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { AuthModeConfig, readAuthModeConfig } from '../auth-mode';
import { OidcError, OpenIdOidcClient } from './oidc-client';
import {
  FakeOidcIssuer,
  FakeOidcUser,
} from '../../../../test/helpers/fake-oidc-issuer';

const USER: FakeOidcUser = {
  sub: '3f2b8c1e-9d4a-4e7b-8a6c-1b2d3e4f5a6b',
  email: 'person@example.com',
  email_verified: true,
  name: 'Person',
};

function configFor(issuer: string): AuthModeConfig {
  return readAuthModeConfig(
    (key) =>
      ({
        AUTH_MODE: 'sso',
        ACCOUNTS_OIDC_ISSUER: issuer,
        ACCOUNTS_OIDC_CLIENT_ID: 'test-client',
        ACCOUNTS_OIDC_CLIENT_SECRET: 'test-secret',
        CLIENT_URL: 'http://localhost:3000',
      })[key],
  );
}

function checks() {
  const codeVerifier = randomBytes(32).toString('base64url');
  return {
    state: randomBytes(32).toString('base64url'),
    nonce: randomBytes(32).toString('base64url'),
    codeVerifier,
    codeChallenge: createHash('sha256')
      .update(codeVerifier)
      .digest('base64url'),
  };
}

async function failureOf(promise: Promise<unknown>): Promise<OidcError> {
  try {
    await promise;
  } catch (err) {
    expect(err).toBeInstanceOf(OidcError);
    return err as OidcError;
  }
  throw new Error('expected a failure');
}

describe('OpenIdOidcClient (가짜 발급자)', () => {
  const issuer = new FakeOidcIssuer();
  let oidc: OpenIdOidcClient;

  beforeAll(async () => {
    await issuer.start();
  });
  afterAll(async () => {
    await issuer.stop();
  });
  beforeEach(() => {
    issuer.reset();
    // 시험마다 새 손님 — 안내판 · JWKS 캐시가 앞 시험에서 이어지지 않게
    oidc = new OpenIdOidcClient(configFor(issuer.issuer));
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** start → (가짜) 로그인 → 콜백 → exchange */
  async function login(user = USER, approve = {}) {
    const c = checks();
    const url = await oidc.authorizationUrl({ ...c, lang: 'ko' });
    const callback = new URL(issuer.approve(url, user, approve)).searchParams;
    return oidc.exchange(callback, c);
  }

  it('authorize 주소: code + S256 + ui_locales, offline_access 를 청하지 않는다', async () => {
    const c = checks();
    const url = new URL(await oidc.authorizationUrl({ ...c, lang: 'ja' }));
    expect(url.origin + url.pathname).toBe(`${issuer.issuer}/auth`);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'test-client',
      redirect_uri: 'http://localhost:3000/api/v1/auth/oidc/callback',
      response_type: 'code',
      scope: 'openid email profile',
      state: c.state,
      nonce: c.nonce,
      code_challenge: c.codeChallenge,
      code_challenge_method: 'S256',
      ui_locales: 'ja',
    });
  });

  it('맞는 토큰 → 클레임과 userinfo', async () => {
    const { claims, accessToken } = await login();
    expect(claims.sub).toBe(USER.sub);
    await expect(oidc.userinfo(accessToken, claims.sub)).resolves.toEqual({
      sub: USER.sub,
      email: USER.email,
      email_verified: true,
      name: 'Person',
      preferred_username: 'person',
    });
  });

  it.each([
    ['iss', { iss: 'http://127.0.0.1:1/oidc' }],
    ['aud', { aud: 'someone-else' }],
    ['nonce', { nonce: 'not-the-nonce' }],
  ])('틀린 %s → 거절', async (_name, idTokenClaims) => {
    issuer.knobs.idTokenClaims = idTokenClaims;
    expect((await failureOf(login())).code).toBe('sso_failed');
  });

  it('aud 가 여럿이면 azp 가 우리여야 한다', async () => {
    issuer.knobs.idTokenClaims = {
      aud: ['test-client', 'other'],
      azp: 'other',
    };
    expect((await failureOf(login())).code).toBe('sso_failed');
    issuer.knobs.idTokenClaims = {
      aud: ['test-client', 'other'],
      azp: 'test-client',
    };
    await expect(login()).resolves.toBeDefined();
  });

  it('시계 허용 60초: 만료 61초 → 거절, 59초 → 통과', async () => {
    // 시계를 멈춘다 — 경계에서 1초를 넘기면 59초가 60초가 되어 흔들린다
    const frozen = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(frozen);
    const now = Math.floor(frozen / 1000);
    issuer.knobs.idTokenClaims = { exp: now - 61 };
    expect((await failureOf(login())).code).toBe('sso_failed');
    issuer.knobs.idTokenClaims = { exp: now - 59 };
    await expect(login()).resolves.toBeDefined();
    issuer.knobs.idTokenClaims = { iat: now + 59 };
    await expect(login()).resolves.toBeDefined();
  });

  it.each(['none', 'HS256'] as const)(
    'alg %s → 거절 (RS256 만)',
    async (alg) => {
      issuer.knobs.signWith = alg;
      expect((await failureOf(login())).code).toBe('sso_failed');
    },
  );

  it('서명이 틀리면 거절 — TLS 로 받은 토큰도 서명을 본다', async () => {
    issuer.knobs.idTokenHeader = { kid: undefined };
    await expect(login()).resolves.toBeDefined();
    // 다른 키의 kid 를 달면 그 키로 검증되어 실패한다
    issuer.rotateKey();
    const { kid } = (
      (await (await fetch(`${issuer.issuer}/jwks`)).json()) as {
        keys: { kid: string }[];
      }
    ).keys[1];
    issuer.knobs.idTokenHeader = { kid };
    expect((await failureOf(login())).code).toBe('sso_failed');
  });

  it('모르는 kid: 받은 지 60초가 지났으면 한 번 다시 받고 통과, 60초 안이면 다시 받지 않고 거절', async () => {
    const realNow = Date.now();
    let offset = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => realNow + offset);

    await login();
    expect(issuer.hits.jwks).toBe(1);

    offset = 61_000;
    issuer.rotateKey();
    await expect(login()).resolves.toBeDefined();
    expect(issuer.hits.jwks).toBe(2);

    issuer.rotateKey();
    expect((await failureOf(login())).code).toBe('sso_failed');
    expect(issuer.hits.jwks).toBe(2);
  });

  it('안내판 issuer 가 설정과 다르면 거절', async () => {
    issuer.knobs.discoveryIssuer = 'http://127.0.0.1:1/oidc';
    expect((await failureOf(login())).code).toBe('sso_failed');
  });

  it('userinfo sub 가 id_token 과 다르면 거절', async () => {
    const { claims, accessToken } = await login();
    issuer.knobs.userinfoSub = '00000000-1111-4222-8333-444444444444';
    expect((await failureOf(oidc.userinfo(accessToken, claims.sub))).code).toBe(
      'sso_failed',
    );
  });

  it('콜백에 iss 가 없거나 다르면 거절 (mix-up)', async () => {
    expect((await failureOf(login(USER, { iss: null }))).code).toBe(
      'sso_failed',
    );
    expect(
      (await failureOf(login(USER, { iss: 'http://127.0.0.1:1/oidc' }))).code,
    ).toBe('sso_failed');
  });

  it('같은 code 두 번 → 두 번째 거절', async () => {
    const c = checks();
    const url = await oidc.authorizationUrl({ ...c, lang: 'ko' });
    const callback = new URL(issuer.approve(url, USER)).searchParams;
    await oidc.exchange(callback, c);
    expect((await failureOf(oidc.exchange(callback, c))).code).toBe(
      'sso_failed',
    );
  });

  it('token 400 → 거절, 메시지에 비밀 · 응답 본문이 없다', async () => {
    issuer.knobs.tokenError = {
      status: 400,
      body: { error: 'invalid_grant', error_description: 'secret-ish detail' },
    };
    const err = await failureOf(login());
    expect(err.code).toBe('sso_failed');
    expect(err.message).toContain('invalid_grant');
    expect(err.message).not.toContain('test-secret');
    expect(err.message).not.toContain('secret-ish detail');
  });

  it('6초 지연 → 5초 시간 제한으로 sso_unavailable', async () => {
    await oidc.authorizationUrl({ ...checks(), lang: 'ko' });
    issuer.knobs.delayMs = 6_000;
    const started = Date.now();
    const err = await failureOf(login());
    expect(err.code).toBe('sso_unavailable');
    expect(Date.now() - started).toBeLessThan(5_900);
  }, 15_000);

  it('닿지 않는 발급자 → sso_unavailable, 그 실패는 캐시하지 않는다', async () => {
    const port = await new Promise<number>((resolve) => {
      const s = createServer().listen(0, '127.0.0.1', () => {
        const { port } = s.address() as { port: number };
        s.close(() => resolve(port));
      });
    });
    const dead = new OpenIdOidcClient(
      configFor(`http://127.0.0.1:${port}/oidc`),
    );
    const c = checks();
    expect(
      (await failureOf(dead.authorizationUrl({ ...c, lang: 'ko' }))).code,
    ).toBe('sso_unavailable');
    expect(
      (await failureOf(dead.authorizationUrl({ ...c, lang: 'ko' }))).code,
    ).toBe('sso_unavailable');
  });

  it('end_session 주소: client_id · post_logout_redirect_uri · state, id_token_hint 없음', async () => {
    const url = new URL(await oidc.endSessionUrl({ state: 'st' }));
    expect(url.origin + url.pathname).toBe(`${issuer.issuer}/session/end`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'test-client',
      post_logout_redirect_uri: 'http://localhost:3000/',
      state: 'st',
    });
  });

  it('local 설정으로는 만들 수 없다', () => {
    expect(() => new OpenIdOidcClient({ mode: 'local' })).toThrow();
  });
});
