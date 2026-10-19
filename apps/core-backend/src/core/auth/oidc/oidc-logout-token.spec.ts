import { readAuthModeConfig } from '../auth-mode';
import { OidcError, OpenIdOidcClient } from './oidc-client';
import {
  BACKCHANNEL_LOGOUT_EVENT,
  LOGOUT_TOKEN_MAX_AGE_SEC,
  LogoutTokenError,
  checkLogoutClaims,
} from './oidc-logout-token';
import {
  FakeLogoutTokenOptions,
  FakeOidcIssuer,
} from '../../../../test/helpers/fake-oidc-issuer';

const SUB = '3f2b8c1e-9d4a-4e7b-8a6c-1b2d3e4f5a6b';
const SID = 'b0d7e1a2-sid';

function clientFor(issuer: string, sessionRequired = true) {
  return new OpenIdOidcClient(
    readAuthModeConfig(
      (key) =>
        ({
          AUTH_MODE: 'sso',
          ACCOUNTS_OIDC_ISSUER: issuer,
          ACCOUNTS_OIDC_CLIENT_ID: 'test-client',
          ACCOUNTS_OIDC_CLIENT_SECRET: 'test-secret',
          CLIENT_URL: 'http://localhost:3000',
          ACCOUNTS_OIDC_BACKCHANNEL_SESSION_REQUIRED: String(sessionRequired),
        })[key],
    ),
  );
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('expected a rejection');
}

/**
 * logout_token 검증(OIDC Back-Channel Logout 1.0 §2.6) — 가짜 발급자가 진짜처럼 서명한 토큰에
 * 규칙마다 한 군데씩 틀린 값을 끼운다. jti 재사용은 DB 의 몫이라 backchannel-logout.service.spec 이 본다.
 */
describe('OpenIdOidcClient.verifyLogoutToken (가짜 발급자)', () => {
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
    oidc = clientFor(issuer.issuer);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const token = (options: FakeLogoutTokenOptions = {}) =>
    issuer.logoutToken({ sub: SUB, sid: SID, ...options });

  async function invalid(options: FakeLogoutTokenOptions, client = oidc) {
    const err = await rejection(client.verifyLogoutToken(token(options)));
    expect(err).toBeInstanceOf(LogoutTokenError);
    return err as LogoutTokenError;
  }

  it('맞는 토큰 → jti · iat · sid · sub', async () => {
    const claims = await oidc.verifyLogoutToken(token());
    expect(claims).toEqual({
      jti: expect.any(String) as string,
      iat: expect.any(Number) as number,
      sid: SID,
      sub: SUB,
    });
  });

  it('aud 가 배열이어도 우리 client_id 가 들어 있으면 받는다', async () => {
    await expect(
      oidc.verifyLogoutToken(
        token({ claims: { aud: ['other', 'test-client'] } }),
      ),
    ).resolves.toMatchObject({ sid: SID });
  });

  describe('서명 · 머리 (§2.6 2, §2.4)', () => {
    it('HS256(client_secret 으로 서명) → 거절', async () => {
      expect((await invalid({ signWith: 'HS256' })).message).toContain('alg');
    });

    it('alg none → 거절', async () => {
      await invalid({ signWith: 'none' });
    });

    it('JWKS 에 없는 kid → 거절', async () => {
      await invalid({ header: { kid: 'not-a-known-kid' } });
    });

    it('서명이 내용과 맞지 않으면 거절', async () => {
      const [h, , s] = token().split('.');
      const forged = Buffer.from(
        JSON.stringify({ iss: issuer.issuer, sub: 'someone-else' }),
      ).toString('base64url');
      const err = await rejection(
        oidc.verifyLogoutToken(`${h}.${forged}.${s}`),
      );
      expect(err).toBeInstanceOf(LogoutTokenError);
    });

    it('typ 이 없으면 거절', async () => {
      expect((await invalid({ header: { typ: undefined } })).message).toContain(
        'typ',
      );
    });

    it('머리(alg · typ)가 틀리거나 JWS 가 아니면 발급자에 묻지 않고 거절한다', async () => {
      for (const options of [
        { signWith: 'HS256' as const },
        { signWith: 'none' as const },
        { header: { typ: 'JWT' } },
        { header: { typ: undefined } },
      ]) {
        await invalid(options);
      }
      for (const junk of ['not-a-jwt', 'a.b.c', '']) {
        expect(await rejection(oidc.verifyLogoutToken(junk))).toBeInstanceOf(
          LogoutTokenError,
        );
      }
      expect(issuer.hits.discovery).toBe(0);
      expect(issuer.hits.jwks).toBe(0);
    });

    it('typ 이 logout+jwt 가 아니면 거절 — id_token(typ JWT)을 내밀 수 없다', async () => {
      await invalid({ header: { typ: 'JWT' } });
    });

    it('typ 은 application/ 접두어 · 대소문자를 가리지 않는다(RFC 7515)', async () => {
      await expect(
        oidc.verifyLogoutToken(
          token({ header: { typ: 'application/Logout+JWT' } }),
        ),
      ).resolves.toMatchObject({ sid: SID });
    });
  });

  describe('iss · aud · iat · exp (§2.6 3)', () => {
    it('틀린 iss → 거절', async () => {
      expect(
        (await invalid({ claims: { iss: 'http://127.0.0.1:1/oidc' } })).message,
      ).toContain('claim=iss');
    });

    it('iss 가 없으면 거절', async () => {
      await invalid({ claims: { iss: undefined } });
    });

    it('틀린 aud → 거절', async () => {
      expect(
        (await invalid({ claims: { aud: 'someone-else' } })).message,
      ).toContain('claim=aud');
    });

    it('iat 이 없으면 거절', async () => {
      await invalid({ claims: { iat: undefined } });
    });

    it('iat 이 시계 허용(60초)보다 앞이면 거절, 안이면 받는다', async () => {
      const now = Math.floor(Date.now() / 1000);
      await invalid({ claims: { iat: now + 120 } });
      await expect(
        oidc.verifyLogoutToken(token({ claims: { iat: now + 30 } })),
      ).resolves.toBeDefined();
    });

    it(`iat 이 ${LOGOUT_TOKEN_MAX_AGE_SEC}초 + 허용보다 오래면 거절 (jti 를 쥐는 기간 밖)`, async () => {
      const now = Math.floor(Date.now() / 1000);
      await invalid({
        claims: { iat: now - LOGOUT_TOKEN_MAX_AGE_SEC - 120, exp: undefined },
      });
    });

    it('exp 가 지났으면 거절, 없으면 받는다', async () => {
      const now = Math.floor(Date.now() / 1000);
      await invalid({ claims: { iat: now - 300, exp: now - 120 } });
      await expect(
        oidc.verifyLogoutToken(token({ claims: { exp: undefined } })),
      ).resolves.toBeDefined();
    });
  });

  describe('클레임 (§2.6 4~6)', () => {
    it('events 가 없으면 거절', async () => {
      await invalid({ claims: { events: undefined } });
    });

    it('events 의 열쇠가 back-channel logout 이 아니면 거절', async () => {
      await invalid({
        claims: {
          events: { 'http://schemas.openid.net/event/something-else': {} },
        },
      });
    });

    it('nonce 가 있으면 거절', async () => {
      expect((await invalid({ claims: { nonce: 'n' } })).message).toContain(
        'nonce',
      );
    });

    it('sid 도 sub 도 없으면 거절', async () => {
      await invalid({ sid: undefined, sub: undefined });
    });

    it('session_required(기본)인데 sid 가 없으면 거절', async () => {
      expect((await invalid({ sid: undefined })).message).toContain('sid');
    });

    it('session_required=false 면 sub 만으로 받는다', async () => {
      const relaxed = clientFor(issuer.issuer, false);
      await expect(
        relaxed.verifyLogoutToken(issuer.logoutToken({ sub: SUB })),
      ).resolves.toEqual(
        expect.objectContaining({ sub: SUB, sid: undefined }) as object,
      );
    });

    it('jti 가 없으면 거절', async () => {
      await invalid({ claims: { jti: undefined } });
    });
  });

  it('발급자 JWKS 에 닿지 못하면 OidcError(sso_unavailable) — 토큰 탓이 아니다', async () => {
    const lonely = new FakeOidcIssuer();
    await lonely.start();
    const client = clientFor(lonely.issuer);
    // 안내판만 받아 둔 뒤(JWKS 는 아직) 발급자가 죽는다
    await client.authorizationUrl({
      state: 's',
      nonce: 'n',
      codeChallenge: 'c',
      lang: 'ko',
    });
    const signed = lonely.logoutToken({ sub: SUB, sid: SID });
    await lonely.stop();
    const err = await rejection(client.verifyLogoutToken(signed));
    expect(err).toBeInstanceOf(OidcError);
    expect((err as OidcError).code).toBe('sso_unavailable');
  });
});

describe('checkLogoutClaims', () => {
  const base = {
    iat: 1,
    jti: 'j',
    sid: 's',
    events: { [BACKCHANNEL_LOGOUT_EVENT]: {} },
  };

  it('events 의 값이 객체가 아니면 거절', () => {
    expect(() =>
      checkLogoutClaims(
        { ...base, events: { [BACKCHANNEL_LOGOUT_EVENT]: 'yes' } },
        { sessionRequired: true },
      ),
    ).toThrow(LogoutTokenError);
  });

  it('events 가 배열이면 거절', () => {
    expect(() =>
      checkLogoutClaims(
        { ...base, events: [BACKCHANNEL_LOGOUT_EVENT] },
        { sessionRequired: true },
      ),
    ).toThrow(LogoutTokenError);
  });

  it.each(['sid', 'sub', 'jti'])(
    '%s 가 빈 글자 · 문자열이 아님 · 너무 김 → 거절',
    (name) => {
      for (const bad of ['', 42, 'x'.repeat(256)]) {
        expect(() =>
          checkLogoutClaims(
            { ...base, sub: 'u', [name]: bad },
            { sessionRequired: false },
          ),
        ).toThrow(LogoutTokenError);
      }
    },
  );
});
