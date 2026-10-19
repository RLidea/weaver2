/**
 * SSO(OIDC 손님) 로그인 Integration Tests — AUTH_MODE=sso, 가짜 발급자(네트워크 밖으로 안 나감)
 *
 * start → (가짜 발급자에서 로그인) → callback → 세션 쿠키. 사람은 시험 안에서 만든다(시드에 기대지 않는다).
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { PrismaService } from '@weaver2/prisma';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import { FakeOidcIssuer, FakeOidcUser } from '../helpers/fake-oidc-issuer';
import {
  applyLink,
  findLinkRows,
  planLink,
} from '../../src/core/auth/oidc/sso-link';

const DOMAIN = '@sso-it.local';
const CALLBACK_PREFIX = 'http://localhost:3000/api';

function setCookies(res: request.Response): string[] {
  return (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
}

/** Set-Cookie 들을 `name=value; …` 로. 뒤에 온 같은 이름이 이기고, 지운 쿠키는 뺀다 */
function jar(...lists: string[][]): string {
  const map = new Map<string, string>();
  for (const list of lists) {
    for (const line of list) {
      const [pair] = line.split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1);
      if (!value || /Expires=Thu, 01 Jan 1970/i.test(line)) map.delete(name);
      else map.set(name, value);
    }
  }
  return [...map].map(([k, v]) => `${k}=${v}`).join('; ');
}

function cookieLine(res: request.Response, name: string): string | undefined {
  return setCookies(res).find((c) => c.startsWith(`${name}=`));
}

describe('SSO login (Integration, AUTH_MODE=sso)', () => {
  const issuer = new FakeOidcIssuer();
  let app: INestApplication;
  let prisma: PrismaService;
  const saved: Record<string, string | undefined> = {};

  beforeAll(async () => {
    await issuer.start();
    const env = {
      AUTH_MODE: 'sso',
      ACCOUNTS_OIDC_ISSUER: issuer.issuer,
      ACCOUNTS_OIDC_CLIENT_ID: issuer.clientId,
      ACCOUNTS_OIDC_CLIENT_SECRET: issuer.clientSecret,
      CLIENT_URL: 'http://localhost:3000',
      ACCOUNTS_OIDC_LANGS: 'ko,en,ja',
      ACCOUNTS_OIDC_FAILURE_URLS: 'admin=/login,site=/{lang}/account/sign-in/',
    };
    for (const [k, v] of Object.entries(env)) {
      saved[k] = process.env[k];
      process.env[k] = v;
    }
    app = await createTestApp();
    prisma = getTestingModule().get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    await closeTestApp();
    await issuer.stop();
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  beforeEach(() => issuer.reset());

  function person(over: Partial<FakeOidcUser> = {}): FakeOidcUser {
    const id = randomUUID();
    return {
      sub: id,
      email: `p_${id.slice(0, 8)}${DOMAIN}`,
      email_verified: true,
      name: `p ${id.slice(0, 6)}`,
      ...over,
    };
  }

  async function start(query = 'entry=admin&next=/admin') {
    const res = await request(app.getHttpServer()).get(
      `/v1/auth/oidc/start?${query}`,
    );
    expect(res.status).toBe(302);
    const tx = cookieLine(res, 'oidc_tx');
    expect(tx).toBeDefined();
    return {
      res,
      location: res.headers.location,
      cookie: tx!.split(';')[0],
    };
  }

  function callback(url: string, cookie: string) {
    expect(url.startsWith(CALLBACK_PREFIX)).toBe(true);
    return request(app.getHttpServer())
      .get(url.slice(CALLBACK_PREFIX.length))
      .set('Cookie', cookie);
  }

  /** start → 가짜 발급자에서 로그인 → callback */
  async function login(
    user: FakeOidcUser,
    {
      query,
      extraCookie,
      approve,
    }: {
      query?: string;
      extraCookie?: string;
      approve?: Parameters<FakeOidcIssuer['approve']>[2];
    } = {},
  ) {
    const s = await start(query);
    const cb = issuer.approve(s.location, user, approve);
    return callback(cb, [s.cookie, extraCookie].filter(Boolean).join('; '));
  }

  describe('start', () => {
    it('authorize 로 302 — S256 · ui_locales, tx 쿠키는 HttpOnly · SameSite=Lax · path=/', async () => {
      const { location, res } = await start('entry=admin&next=/admin&lang=ja');
      const url = new URL(location);
      expect(url.origin + url.pathname).toBe(`${issuer.issuer}/auth`);
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('ui_locales')).toBe('ja');
      expect(url.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3000/api/v1/auth/oidc/callback',
      );
      const tx = cookieLine(res, 'oidc_tx')!;
      expect(tx).toMatch(/HttpOnly/i);
      expect(tx).toMatch(/SameSite=Lax/i);
      expect(tx).toMatch(/Path=\//);
      expect(tx).not.toMatch(/Domain=/i);
    });

    it('lang 이 목록 밖이면 첫 값', async () => {
      const { location } = await start('lang=xx');
      expect(new URL(location).searchParams.get('ui_locales')).toBe('ko');
    });

    it('entry 가 표 밖이면 admin 의 실패 주소로', async () => {
      const s = await start('entry=evil&lang=ja');
      const res = await callback(
        issuer.approve(s.location, person(), { error: 'access_denied' }),
        s.cookie,
      );
      expect(res.headers.location).toBe('/login?error=sso_cancelled');
    });

    it('발급자에 닿지 못하면(5초 시간 제한) 실패 주소에 sso_unavailable', async () => {
      const s = await start('entry=site&lang=en');
      const cb = issuer.approve(s.location, person());
      issuer.knobs.delayMs = 6_000;
      const res = await callback(cb, s.cookie);
      expect(res.headers.location).toBe(
        '/en/account/sign-in/?error=sso_unavailable',
      );
    }, 20_000);
  });

  describe('callback', () => {
    it('정상 → access · refresh(7일) 쿠키, tx 쿠키 지움, Location = next', async () => {
      const user = person();
      const res = await login(user);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin');
      expect(cookieLine(res, 'access_token')).toBeDefined();
      expect(cookieLine(res, 'refresh_token')).toMatch(/Max-Age=604800/);
      expect(cookieLine(res, 'oidc_tx')).toMatch(/Expires=Thu, 01 Jan 1970/);
      expect(cookieLine(res, 'pre_auth')).toMatch(/Expires=Thu, 01 Jan 1970/);

      const row = await prisma.user.findUnique({
        where: { ssoSubject: user.sub },
        include: { localCredential: true },
      });
      expect(row).toMatchObject({ email: user.email });
      expect(row!.emailVerifiedAt).toBeInstanceOf(Date);
      expect(row!.localCredential).toBeNull();

      // 받은 세션으로 내 정보가 열린다
      const me = await request(app.getHttpServer())
        .get('/v1/users/me')
        .set('Cookie', jar(setCookies(res)));
      expect(me.status).toBe(200);
    });

    // 탭 · 역슬래시는 URL 파서가 지우거나 / 로 읽는다 — `/\t/evil.com` · `\\evil.com` 은 `//evil.com` 이 된다
    it.each([
      '//evil.com',
      'https://evil.com',
      '/\t/evil.com',
      '\\\\evil.com',
      '/\\evil.com',
      // 출처는 같지만 점 마디를 풀면 //evil.com 이 된다 (보안 검토 H1)
      '/.//evil.com',
      '/..//evil.com',
      '/%2e//evil.com',
      '/a/..//evil.com',
      '/x/../\\evil.com',
      '/./\\evil.com',
    ])('next=%j → 기본 next', async (next) => {
      const res = await login(person(), {
        query: `entry=admin&next=${encodeURIComponent(next)}`,
      });
      expect(res.headers.location).toBe('/dashboard');
    });

    it('state 가 다르면 실패 주소, tx 는 남는다', async () => {
      const s = await start();
      const res = await callback(
        issuer.approve(s.location, person(), { state: 'forged' }),
        s.cookie,
      );
      expect(res.headers.location).toBe('/login?error=sso_failed');
      expect(cookieLine(res, 'oidc_tx')).toBeUndefined();
    });

    it('tx 가 없으면 실패 — 입구를 모르므로 표의 site(없으면 admin), 첫 언어', async () => {
      const s = await start();
      const res = await callback(issuer.approve(s.location, person()), '');
      expect(res.headers.location).toBe(
        '/ko/account/sign-in/?error=sso_failed',
      );
    });

    it('같은 출처의 경로는 그대로 next', async () => {
      const res = await login(person(), {
        query: `entry=admin&next=${encodeURIComponent('/admin/users?tab=a#x')}`,
      });
      expect(res.headers.location).toBe('/admin/users?tab=a#x');
    });

    it('iss 가 없거나 다르면 실패', async () => {
      for (const iss of [null, 'http://127.0.0.1:1/oidc']) {
        const res = await login(person(), { approve: { iss } });
        expect(res.headers.location).toBe('/login?error=sso_failed');
      }
    });

    it('error=access_denied → sso_cancelled, 실패 주소는 entry · lang 으로 고른다', async () => {
      const res = await login(person(), {
        query: 'entry=site&lang=ja',
        approve: { error: 'access_denied' },
      });
      expect(res.headers.location).toBe(
        '/ja/account/sign-in/?error=sso_cancelled',
      );
    });

    it('같은 code 두 번 → 두 번째 실패', async () => {
      const s = await start();
      const cb = issuer.approve(s.location, person());
      expect((await callback(cb, s.cookie)).headers.location).toBe('/admin');
      expect((await callback(cb, s.cookie)).headers.location).toBe(
        '/login?error=sso_failed',
      );
    });

    it('같은 tx 로 두 번째 콜백(다른 nonce 의 code) → 실패', async () => {
      const s = await start();
      expect(
        (await callback(issuer.approve(s.location, person()), s.cookie)).headers
          .location,
      ).toBe('/admin');
      const other = new URL(s.location);
      other.searchParams.set('nonce', 'another-login');
      const res = await callback(
        issuer.approve(other.toString(), person()),
        s.cookie,
      );
      expect(res.headers.location).toBe('/login?error=sso_failed');
    });
  });

  describe('찾기 · 만들기 (D6 — 이메일로 저절로 잇지 않는다)', () => {
    it('sub 로 이어진 행 → 그 행으로', async () => {
      const user = person();
      const row = await prisma.user.create({
        data: {
          email: user.email,
          username: `u_${user.sub.slice(0, 8)}`,
          displayName: `u ${user.sub.slice(0, 8)}`,
          ssoSubject: user.sub,
        },
      });
      const res = await login(user);
      expect(res.headers.location).toBe('/admin');
      expect(await prisma.user.count({ where: { ssoSubject: user.sub } })).toBe(
        1,
      );
      expect(
        (await prisma.refreshToken.count({ where: { userId: row.id } })) > 0,
      ).toBe(true);
    });

    it('모르는 sub + 같은 이메일(대소문자만 다름) → sso_conflict, 행은 그대로', async () => {
      const user = person();
      const row = await prisma.user.create({
        data: {
          email: user.email,
          username: `c_${user.sub.slice(0, 8)}`,
          displayName: `c ${user.sub.slice(0, 8)}`,
        },
      });
      const res = await login({ ...user, email: user.email.toUpperCase() });
      expect(res.headers.location).toBe('/login?error=sso_conflict');
      const after = await prisma.user.findUnique({ where: { id: row.id } });
      expect(after!.ssoSubject).toBeNull();
      expect(
        await prisma.refreshToken.count({ where: { userId: row.id } }),
      ).toBe(0);
    });

    it('모르는 sub + 미인증 이메일 → sso_email_unverified, 행을 만들지 않는다', async () => {
      const user = person({ email_verified: false });
      const res = await login(user);
      expect(res.headers.location).toBe('/login?error=sso_email_unverified');
      expect(await prisma.user.count({ where: { ssoSubject: user.sub } })).toBe(
        0,
      );
    });

    it('이어진 사람 + 미인증 → 로그인은 되고 이메일은 그대로', async () => {
      const user = person();
      await login(user);
      const res = await login({
        ...user,
        email: `changed_${user.email}`,
        email_verified: false,
      });
      expect(res.headers.location).toBe('/admin');
      const row = await prisma.user.findUnique({
        where: { ssoSubject: user.sub },
      });
      expect(row!.email).toBe(user.email);
    });

    it('이어진 사람의 이메일이 바뀜 + 인증됨 → 맞추고 emailVerifiedAt 갱신', async () => {
      const user = person();
      await login(user);
      const before = await prisma.user.findUnique({
        where: { ssoSubject: user.sub },
      });
      const newEmail = `moved_${user.email}`;
      await login({ ...user, email: newEmail });
      const after = await prisma.user.findUnique({
        where: { ssoSubject: user.sub },
      });
      expect(after!.email).toBe(newEmail);
      expect(after!.emailVerifiedAt!.getTime()).toBeGreaterThanOrEqual(
        before!.emailVerifiedAt!.getTime(),
      );
    });

    it('바뀐 이메일을 다른 행이 쓰면 맞추지 않고 로그인은 된다', async () => {
      const user = person();
      await login(user);
      const other = person();
      await prisma.user.create({
        data: {
          email: other.email,
          username: `o_${other.sub.slice(0, 8)}`,
          displayName: `o ${other.sub.slice(0, 8)}`,
        },
      });
      const res = await login({ ...user, email: other.email });
      expect(res.headers.location).toBe('/admin');
      const row = await prisma.user.findUnique({
        where: { ssoSubject: user.sub },
      });
      expect(row!.email).toBe(user.email);
    });

    it('같은 sub 가 거의 동시에 둘 (P2002) → 둘 다 같은 행으로 로그인', async () => {
      const user = person();
      const [a, b] = await Promise.all([start(), start()]);
      const [ra, rb] = await Promise.all([
        callback(issuer.approve(a.location, user), a.cookie),
        callback(issuer.approve(b.location, user), b.cookie),
      ]);
      expect([ra.headers.location, rb.headers.location]).toEqual([
        '/admin',
        '/admin',
      ]);
      expect(await prisma.user.count({ where: { ssoSubject: user.sub } })).toBe(
        1,
      );
    });

    it('탈퇴 → account_deleted', async () => {
      const user = person();
      await prisma.user.create({
        data: {
          email: user.email,
          username: `d_${user.sub.slice(0, 8)}`,
          displayName: `d ${user.sub.slice(0, 8)}`,
          ssoSubject: user.sub,
          deletedAt: new Date(),
        },
      });
      expect((await login(user)).headers.location).toBe(
        '/login?error=account_deleted',
      );
    });

    it('정지 → account_suspended', async () => {
      const user = person();
      await prisma.user.create({
        data: {
          email: user.email,
          username: `s_${user.sub.slice(0, 8)}`,
          displayName: `s ${user.sub.slice(0, 8)}`,
          ssoSubject: user.sub,
          suspendedUntil: new Date(Date.now() + 3_600_000),
        },
      });
      expect((await login(user)).headers.location).toBe(
        '/login?error=account_suspended',
      );
    });

    it('정지된 사람은 이메일을 맞추지 않는다 — 거절 전에 쓰지 않는다', async () => {
      const user = person();
      await prisma.user.create({
        data: {
          email: user.email,
          username: `x_${user.sub.slice(0, 8)}`,
          displayName: `x ${user.sub.slice(0, 8)}`,
          ssoSubject: user.sub,
          suspendedUntil: new Date(Date.now() + 3_600_000),
        },
      });
      const res = await login({ ...user, email: `moved_${user.email}` });
      expect(res.headers.location).toBe('/login?error=account_suspended');
      const row = await prisma.user.findUnique({
        where: { ssoSubject: user.sub },
      });
      expect(row!.email).toBe(user.email);
    });

    it('TOTP 를 켠 사람 → pre_auth 없이 세션', async () => {
      const user = person();
      const row = await prisma.user.create({
        data: {
          email: user.email,
          username: `t_${user.sub.slice(0, 8)}`,
          displayName: `t ${user.sub.slice(0, 8)}`,
          ssoSubject: user.sub,
          twoFactorMethods: {
            create: {
              kind: 'TOTP',
              secretEncrypted: 'v1:x',
              confirmedAt: new Date(),
            },
          },
        },
      });
      const res = await login(user);
      expect(res.headers.location).toBe('/admin');
      expect(cookieLine(res, 'access_token')).toBeDefined();
      expect(
        await prisma.refreshToken.count({ where: { userId: row.id } }),
      ).toBe(1);
    });

    it('탈퇴하면 ssoSubject 를 비운다 — 같은 sub 가 다시 와도 탈퇴한 행으로 들어가지 않는다', async () => {
      const user = person();
      const first = await login(user);
      const cookies = jar(setCookies(first));
      const csrf = await request(app.getHttpServer())
        .get('/v1/auth/csrf-token')
        .set('Cookie', cookies);
      const token = (csrf.body as { data: { csrfToken: string } }).data
        .csrfToken;
      const withdraw = await request(app.getHttpServer())
        .delete('/v1/users/me')
        .set('Cookie', jar(setCookies(first), setCookies(csrf)))
        .set('x-csrf-token', token);
      expect(withdraw.status).toBeLessThan(300);
      expect(await prisma.user.count({ where: { ssoSubject: user.sub } })).toBe(
        0,
      );
      // weaver2 는 탈퇴 때 이메일을 익명화하지 않는다 — 그 이메일을 쥔 탈퇴 행이 있으면 account_deleted
      expect((await login(user)).headers.location).toBe(
        '/login?error=account_deleted',
      );
    });

    it('sso:link 로 이은 행은 SSO 로그인 뒤에도 같은 id', async () => {
      const user = person();
      const row = await prisma.user.create({
        data: {
          email: user.email,
          username: `l_${user.sub.slice(0, 8)}`,
          displayName: `l ${user.sub.slice(0, 8)}`,
        },
      });
      expect((await login(user)).headers.location).toBe(
        '/login?error=sso_conflict',
      );
      const plan = planLink(
        await findLinkRows(prisma, user.email, user.sub),
        user.email,
        user.sub,
      );
      expect(plan.action).toBe('link');
      if (plan.action === 'link') await applyLink(prisma, plan);
      expect((await login(user)).headers.location).toBe('/admin');
      expect(
        (await prisma.user.findUnique({ where: { ssoSubject: user.sub } }))!.id,
      ).toBe(row.id);
    });
  });

  describe('세션', () => {
    it('A 의 refresh 쿠키를 단 채 B 로 콜백 → A 의 refresh 행이 지워지고 B 세션', async () => {
      const a = person();
      const b = person();
      const resA = await login(a);
      const aRow = await prisma.user.findUnique({
        where: { ssoSubject: a.sub },
      });
      expect(
        await prisma.refreshToken.count({ where: { userId: aRow!.id } }),
      ).toBe(1);

      const aRefresh = cookieLine(resA, 'refresh_token')!.split(';')[0];
      const resB = await login(b, { extraCookie: aRefresh });
      expect(resB.headers.location).toBe('/admin');
      expect(
        await prisma.refreshToken.count({ where: { userId: aRow!.id } }),
      ).toBe(0);
      const bRow = await prisma.user.findUnique({
        where: { ssoSubject: b.sub },
      });
      expect(
        await prisma.refreshToken.count({ where: { userId: bRow!.id } }),
      ).toBe(1);
    });

    it('로그아웃: refresh 행 · 쿠키를 지운 뒤 endSessionUrl (client_id · post_logout · state, id_token_hint 없음)', async () => {
      const user = person();
      const res = await login(user);
      const row = await prisma.user.findUnique({
        where: { ssoSubject: user.sub },
      });
      const csrf = await request(app.getHttpServer())
        .get('/v1/auth/csrf-token')
        .set('Cookie', jar(setCookies(res)));
      const token = (csrf.body as { data: { csrfToken: string } }).data
        .csrfToken;
      const out = await request(app.getHttpServer())
        .post('/v1/auth/sign-out')
        .set('Cookie', jar(setCookies(res), setCookies(csrf)))
        .set('x-csrf-token', token);
      expect(out.status).toBe(201);
      expect(cookieLine(out, 'refresh_token')).toMatch(
        /Expires=Thu, 01 Jan 1970/,
      );
      expect(
        await prisma.refreshToken.count({ where: { userId: row!.id } }),
      ).toBe(0);

      const url = new URL(
        (out.body as { data: { endSessionUrl: string } }).data.endSessionUrl,
      );
      expect(url.origin + url.pathname).toBe(`${issuer.issuer}/session/end`);
      expect(url.searchParams.get('client_id')).toBe(issuer.clientId);
      expect(url.searchParams.get('post_logout_redirect_uri')).toBe(
        'http://localhost:3000/',
      );
      expect(url.searchParams.get('state')).toBeTruthy();
      expect(url.searchParams.has('id_token_hint')).toBe(false);
    });
  });
});
