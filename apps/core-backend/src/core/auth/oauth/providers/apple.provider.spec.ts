import { generateKeyPairSync, KeyObject, sign, verify } from 'crypto';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { AppleOAuthProvider } from './apple.provider';

const CLIENT_ID = 'com.example.web';

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function makeIdToken(
  key: KeyObject,
  kid: string,
  claims: Record<string, unknown>,
): string {
  const header = b64url(JSON.stringify({ alg: 'RS256', kid }));
  const payload = b64url(JSON.stringify(claims));
  const signature = sign(
    'RSA-SHA256',
    Buffer.from(`${header}.${payload}`),
    key,
  );
  return `${header}.${payload}.${b64url(signature)}`;
}

describe('AppleOAuthProvider', () => {
  const appleKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const ecKey = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const ecPem = ecKey.privateKey.export({
    type: 'pkcs8',
    format: 'pem',
  }) as string;
  const jwk = { ...appleKey.publicKey.export({ format: 'jwk' }), kid: 'k1' };

  let env: Record<string, string | undefined>;
  let provider: AppleOAuthProvider;
  let fetchMock: jest.Mock;
  const nowSec = () => Math.floor(Date.now() / 1000);
  const validClaims = () => ({
    iss: 'https://appleid.apple.com',
    aud: CLIENT_ID,
    exp: nowSec() + 600,
    sub: 'apple-sub-1',
    email: 'user@privaterelay.appleid.com',
    email_verified: 'true',
    is_private_email: 'true',
  });

  beforeEach(() => {
    env = {
      APPLE_CLIENT_ID: CLIENT_ID,
      APPLE_TEAM_ID: 'TEAM123456',
      APPLE_KEY_ID: 'KEY1234567',
      APPLE_PRIVATE_KEY: ecPem.replace(/\n/g, '\\n'),
      APPLE_CALLBACK_URL:
        'https://example.com/api/v1/auth/oauth/apple/callback',
    };
    const config = { get: (k: string) => env[k] } as unknown as ConfigService;
    provider = new AppleOAuthProvider(config);
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ keys: [jwk] }),
    });
    global.fetch = fetchMock;
  });

  describe('getAuthorizationUrl', () => {
    it('form_post 와 name·email scope 로 요청한다', () => {
      const url = new URL(provider.getAuthorizationUrl('st'));
      expect(url.origin + url.pathname).toBe(
        'https://appleid.apple.com/auth/authorize',
      );
      expect(url.searchParams.get('response_mode')).toBe('form_post');
      expect(url.searchParams.get('scope')).toBe('name email');
      expect(url.searchParams.get('state')).toBe('st');
      expect(provider.usesFormPost).toBe(true);
    });
  });

  describe('createClientSecret', () => {
    const check = (secret: string) => {
      const [h, p, s] = secret.split('.');
      const ok = verify(
        'sha256',
        Buffer.from(`${h}.${p}`),
        { key: ecKey.publicKey, dsaEncoding: 'ieee-p1363' },
        Buffer.from(s, 'base64url'),
      );
      return {
        ok,
        header: JSON.parse(Buffer.from(h, 'base64url').toString()),
        payload: JSON.parse(Buffer.from(p, 'base64url').toString()),
      };
    };

    it('\\n 이스케이프된 키로 ES256 JWT 를 서명한다', () => {
      const { ok, header, payload } = check(provider.createClientSecret());
      expect(ok).toBe(true);
      expect(header).toEqual({ alg: 'ES256', kid: 'KEY1234567' });
      expect(payload).toMatchObject({
        iss: 'TEAM123456',
        sub: CLIENT_ID,
        aud: 'https://appleid.apple.com',
      });
      expect(payload.exp - payload.iat).toBeLessThanOrEqual(15777000);
    });

    it('APPLE_PRIVATE_KEY_PATH 가 있으면 파일에서 읽는다', () => {
      const dir = mkdtempSync(join(tmpdir(), 'apple-key-'));
      const path = join(dir, 'AuthKey.p8');
      writeFileSync(path, ecPem);
      env.APPLE_PRIVATE_KEY = undefined;
      env.APPLE_PRIVATE_KEY_PATH = path;
      expect(check(provider.createClientSecret()).ok).toBe(true);
    });
  });

  describe('verifyIdToken', () => {
    it('Apple JWKS 로 서명을 검증하고 claims 를 돌려준다', async () => {
      const token = makeIdToken(appleKey.privateKey, 'k1', validClaims());
      await expect(provider.verifyIdToken(token)).resolves.toMatchObject({
        sub: 'apple-sub-1',
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://appleid.apple.com/auth/keys',
      );
    });

    it('JWKS 를 캐시해 두 번째에는 다시 받지 않는다', async () => {
      const token = makeIdToken(appleKey.privateKey, 'k1', validClaims());
      await provider.verifyIdToken(token);
      await provider.verifyIdToken(token);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('다른 키로 서명한 토큰은 거절한다', async () => {
      const token = makeIdToken(otherKey.privateKey, 'k1', validClaims());
      await expect(provider.verifyIdToken(token)).rejects.toThrow(/signature/);
    });

    it('모르는 kid 는 거절한다', async () => {
      const token = makeIdToken(appleKey.privateKey, 'nope', validClaims());
      await expect(provider.verifyIdToken(token)).rejects.toThrow(
        /signing key/,
      );
    });

    it('aud 가 우리 client id 가 아니면 거절한다', async () => {
      const token = makeIdToken(appleKey.privateKey, 'k1', {
        ...validClaims(),
        aud: 'com.attacker.app',
      });
      await expect(provider.verifyIdToken(token)).rejects.toThrow(/audience/);
    });

    it('iss 가 Apple 이 아니면 거절한다', async () => {
      const token = makeIdToken(appleKey.privateKey, 'k1', {
        ...validClaims(),
        iss: 'https://evil.example.com',
      });
      await expect(provider.verifyIdToken(token)).rejects.toThrow(/issuer/);
    });

    it('만료된 토큰은 거절한다', async () => {
      const token = makeIdToken(appleKey.privateKey, 'k1', {
        ...validClaims(),
        exp: nowSec() - 1,
      });
      await expect(provider.verifyIdToken(token)).rejects.toThrow(/expired/);
    });

    it('alg 가 RS256 이 아니면 거절한다 (alg=none 등)', async () => {
      const [, p] = makeIdToken(appleKey.privateKey, 'k1', validClaims()).split(
        '.',
      );
      const header = b64url(JSON.stringify({ alg: 'none', kid: 'k1' }));
      await expect(provider.verifyIdToken(`${header}.${p}.`)).rejects.toThrow(
        /algorithm/,
      );
    });
  });

  describe('getUserProfile', () => {
    it('sub 로 식별하고, 문자열 "true" 인 email_verified 도 받는다', async () => {
      const idToken = makeIdToken(appleKey.privateKey, 'k1', validClaims());
      const profile = await provider.getUserProfile(
        { accessToken: 'at', idToken },
        {
          user: JSON.stringify({
            name: { firstName: 'Jane', lastName: 'Doe' },
          }),
        },
      );
      expect(profile).toEqual({
        provider: 'apple',
        providerId: 'apple-sub-1',
        email: 'user@privaterelay.appleid.com',
        displayName: 'Jane Doe',
      });
    });

    it('나중 로그인처럼 email 이 빠지면 빈 email 로 돌려준다', async () => {
      const { email, email_verified, ...rest } = validClaims();
      void email;
      void email_verified;
      const idToken = makeIdToken(appleKey.privateKey, 'k1', rest);
      const profile = await provider.getUserProfile({
        accessToken: 'at',
        idToken,
      });
      expect(profile.providerId).toBe('apple-sub-1');
      expect(profile.email).toBe('');
    });

    it('email_verified 가 false 면 email 을 쓰지 않는다', async () => {
      const idToken = makeIdToken(appleKey.privateKey, 'k1', {
        ...validClaims(),
        email_verified: false,
      });
      const profile = await provider.getUserProfile({
        accessToken: 'at',
        idToken,
      });
      expect(profile.email).toBe('');
    });

    it('id_token 이 없으면 거절한다', async () => {
      await expect(
        provider.getUserProfile({ accessToken: 'at' }),
      ).rejects.toThrow(/id_token/);
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('client_secret 를 실어 교환하고 refresh_token·id_token 을 남긴다', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'at',
            refresh_token: 'rt',
            expires_in: 3600,
            id_token: 'idt',
          }),
      });
      const tokens = await provider.exchangeCodeForTokens('code-1');
      expect(tokens).toMatchObject({
        accessToken: 'at',
        refreshToken: 'rt',
        idToken: 'idt',
      });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://appleid.apple.com/auth/token');
      const body = init.body as URLSearchParams;
      expect(body.get('code')).toBe('code-1');
      expect(body.get('client_secret')?.split('.')).toHaveLength(3);
    });
  });
});
