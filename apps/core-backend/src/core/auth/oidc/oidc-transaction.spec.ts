import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { OidcTransaction, OidcTx } from './oidc-transaction';

const TX: OidcTx = {
  state: 's',
  nonce: 'n',
  verifier: 'v',
  next: '/admin',
  lang: 'ko',
  entry: 'admin',
};

function make(env: Record<string, string>) {
  const config = {
    get: (k: string) => env[k],
    getOrThrow: (k: string) => env[k],
  };
  return new OidcTransaction(
    new JwtService({ secret: env.JWT_SECRET }),
    config as unknown as ConfigService,
  );
}

function fakeResponse() {
  const cookies: { name: string; value: string; options: unknown }[] = [];
  const cleared: { name: string; options: unknown }[] = [];
  const res = {
    cookie: (name: string, value: string, options: unknown) =>
      cookies.push({ name, value, options }),
    clearCookie: (name: string, options: unknown) =>
      cleared.push({ name, options }),
  };
  return { res: res as unknown as Response, cookies, cleared };
}

describe('OidcTransaction', () => {
  it('운영: __Host-oidc_tx · Secure · path=/ · Domain 없음 · httpOnly · SameSite=Lax · 10분', () => {
    const tx = make({ JWT_SECRET: 'x'.repeat(32), NODE_ENV: 'production' });
    const { res, cookies } = fakeResponse();
    tx.write(res, TX);
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe('__Host-oidc_tx');
    expect(cookies[0].options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600_000,
    });
  });

  it('개발: oidc_tx, Secure 아님', () => {
    const tx = make({ JWT_SECRET: 'x'.repeat(32), NODE_ENV: 'development' });
    const { res, cookies, cleared } = fakeResponse();
    tx.write(res, TX);
    tx.clear(res);
    expect(cookies[0].name).toBe('oidc_tx');
    expect(cookies[0].options).toMatchObject({ secure: false });
    expect(cleared[0]).toEqual({
      name: 'oidc_tx',
      options: { httpOnly: true, secure: false, sameSite: 'lax', path: '/' },
    });
  });

  it('쓴 것을 그대로 읽는다', () => {
    const tx = make({ JWT_SECRET: 'x'.repeat(32) });
    const { res, cookies } = fakeResponse();
    tx.write(res, TX);
    const req = {
      cookies: { oidc_tx: cookies[0].value },
    } as unknown as Request;
    expect(tx.read(req)).toMatchObject(TX);
  });

  it('액세스 토큰(같은 JWT_SECRET, 다른 aud · 다른 키)은 tx 로 읽히지 않는다', () => {
    const secret = 'x'.repeat(32);
    const tx = make({ JWT_SECRET: secret });
    const access = new JwtService({ secret }).sign(
      { ...TX },
      { audience: 'oidc-tx' },
    );
    expect(
      tx.read({ cookies: { oidc_tx: access } } as unknown as Request),
    ).toBeNull();
  });

  it('다른 JWT_SECRET 으로 서명된 tx · 망가진 값 · 없음 → null', () => {
    const a = make({ JWT_SECRET: 'a'.repeat(32) });
    const b = make({ JWT_SECRET: 'b'.repeat(32) });
    const { res, cookies } = fakeResponse();
    a.write(res, TX);
    const read = (value: unknown) =>
      b.read({ cookies: { oidc_tx: value } } as unknown as Request);
    expect(read(cookies[0].value)).toBeNull();
    expect(read('garbage')).toBeNull();
    expect(b.read({ cookies: {} } as unknown as Request)).toBeNull();
  });
});
