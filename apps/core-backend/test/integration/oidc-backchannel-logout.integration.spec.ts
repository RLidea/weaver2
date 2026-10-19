/**
 * OIDC back-channel 로그아웃 Integration Tests — AUTH_MODE=sso, 가짜 발급자
 *
 * 가짜 발급자로 SSO 로그인 → 그 세션의 sid 로 서명한 logout_token 을 발급자처럼 form POST
 * (쿠키 · CSRF 토큰 없음) → 그 세션 행만 지워지고 refresh 가 401. 다른 세션은 산다. 같은 토큰은 400.
 * local 모드 404 는 oidc-local-mode.integration.spec.ts 가 본다.
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
import {
  FakeLogoutTokenOptions,
  FakeOidcIssuer,
  FakeOidcUser,
} from '../helpers/fake-oidc-issuer';
import { BackchannelLogoutService } from '../../src/core/auth/oidc/backchannel-logout.service';
import { CreateRefreshTokenCommand } from '../../src/core/auth/repositories/create-refresh-token.command';

const DOMAIN = '@sso-bcl-it.local';
const CALLBACK_PREFIX = 'http://localhost:3000/api';
const PATH = '/v1/auth/oidc/backchannel-logout';

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

function asSetCookie(cookie: string): string[] {
  return cookie ? cookie.split('; ') : [];
}

describe('OIDC back-channel logout (Integration, AUTH_MODE=sso)', () => {
  const issuer = new FakeOidcIssuer();
  const hookCalls: unknown[][] = [];
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
    };
    for (const [k, v] of Object.entries(env)) {
      saved[k] = process.env[k];
      process.env[k] = v;
    }
    app = await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    // 파생 프로젝트가 OIDC_USER_HOOKS 로 거는 훅 자리 — weaver2 에는 그 제공자가 없어 빈 훅에 단다
    const hooks = getTestingModule().get(BackchannelLogoutService)['hooks'];
    hooks.onBackchannelLogout = (...args) => {
      hookCalls.push(args);
    };
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

  beforeEach(() => {
    issuer.reset();
    hookCalls.length = 0;
  });

  function person(): FakeOidcUser {
    const id = randomUUID();
    return {
      sub: id,
      email: `b_${id.slice(0, 8)}${DOMAIN}`,
      email_verified: true,
      name: `b ${id.slice(0, 6)}`,
    };
  }

  /** start → 가짜 발급자 → callback. 세션 쿠키와 그 세션의 sid 를 돌려준다 */
  async function login(user: FakeOidcUser) {
    const server = app.getHttpServer();
    const start = await request(server).get(
      '/v1/auth/oidc/start?entry=admin&next=/admin',
    );
    const tx = setCookies(start)
      .find((c) => c.startsWith('oidc_tx='))!
      .split(';')[0];
    const cb = issuer.approve(start.headers.location, user);
    const res = await request(server)
      .get(cb.slice(CALLBACK_PREFIX.length))
      .set('Cookie', tx);
    expect(res.headers.location).toBe('/admin');
    return { cookie: jar(setCookies(res)), sid: issuer.lastSid(user.sub)! };
  }

  /**
   * refresh 를 보낼 채비 — CSRF 세션 식별자가 refresh 쿠키라 그 쿠키로 토큰을 먼저 받는다.
   * 보내기를 따로 두어 경합 시험이 같은 순간에 여러 번 쏠 수 있게 한다
   */
  async function prepareRefresh(cookie: string) {
    const server = app.getHttpServer();
    const csrf = await request(server)
      .get('/v1/auth/csrf-token')
      .set('Cookie', cookie);
    const token =
      (csrf.body as { data?: { csrfToken?: string } }).data?.csrfToken ?? '';
    const merged = jar(asSetCookie(cookie), setCookies(csrf));
    return async () => {
      const res = await request(server)
        .post('/v1/auth/refresh')
        .set('Cookie', merged)
        .set('x-csrf-token', token);
      return { res, cookie: jar(asSetCookie(merged), setCookies(res)) };
    };
  }

  async function refresh(cookie: string) {
    return (await prepareRefresh(cookie))();
  }

  /** 발급자처럼 — 쿠키 · Origin · CSRF 토큰 없이 form POST */
  function backchannel(logoutToken: string | undefined) {
    const req = request(app.getHttpServer())
      .post(PATH)
      .set('User-Agent', 'RLidea-Accounts/1 (integration)')
      .type('form');
    return req.send(
      logoutToken === undefined ? {} : { logout_token: logoutToken },
    );
  }

  const tokenFor = (
    user: FakeOidcUser,
    sid: string,
    over: FakeLogoutTokenOptions = {},
  ) => issuer.logoutToken({ sub: user.sub, sid, ...over });

  const rowsOf = (sid: string) =>
    prisma.refreshToken.count({ where: { oidcSid: sid } });

  it('콜백이 만든 세션 행에 id_token 의 sid 가 남는다', async () => {
    const user = person();
    const { sid } = await login(user);
    expect(await rowsOf(sid)).toBe(1);
  });

  it('그 sid 의 세션만 지운다 — refresh 는 401, 같은 사람의 다른 세션 · 남의 세션은 산다', async () => {
    const user = person();
    const other = person();
    const a = await login(user);
    const b = await login(user);
    const c = await login(other);
    expect(a.sid).not.toBe(b.sid);

    const res = await backchannel(tokenFor(user, a.sid));
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');

    expect(await rowsOf(a.sid)).toBe(0);
    expect((await refresh(a.cookie)).res.status).toBe(401);
    expect((await refresh(b.cookie)).res.status).toBe(201);
    expect((await refresh(c.cookie)).res.status).toBe(201);
    const row = await prisma.user.findUnique({
      where: { ssoSubject: user.sub },
    });
    expect(hookCalls).toEqual([[row!.id, { sid: a.sid, sub: user.sub }]]);
  });

  it('회전한 세션도 지운다 — 새 refresh 행이 sid 를 이어받는다', async () => {
    const user = person();
    const s = await login(user);
    const rotated = await refresh(s.cookie);
    expect(rotated.res.status).toBe(201);
    // 옛 행(회전 표시) + 새 행
    expect(await rowsOf(s.sid)).toBe(2);

    expect((await backchannel(tokenFor(user, s.sid))).status).toBe(200);
    expect(await rowsOf(s.sid)).toBe(0);
    expect((await refresh(rotated.cookie)).res.status).toBe(401);
  });

  it('같은 logout_token 을 다시 보내면 400 invalid_request (jti)', async () => {
    const user = person();
    const s = await login(user);
    const token = tokenFor(user, s.sid);
    expect((await backchannel(token)).status).toBe(200);
    const again = await backchannel(token);
    expect(again.status).toBe(400);
    expect(again.body).toEqual({ error: 'invalid_request' });
  });

  it('지울 세션이 없어도 200 (이미 로그아웃 · 모르는 sid)', async () => {
    const res = await backchannel(
      issuer.logoutToken({ sub: randomUUID(), sid: randomUUID() }),
    );
    expect(res.status).toBe(200);
    expect(hookCalls).toEqual([[null, expect.anything()]]);
  });

  it.each<[string, FakeLogoutTokenOptions]>([
    ['틀린 aud', { claims: { aud: 'someone-else' } }],
    ['typ 없음', { header: { typ: undefined } }],
    ['nonce 있음', { claims: { nonce: 'n' } }],
    ['HS256', { signWith: 'HS256' }],
    ['sid 없음(session_required)', { sid: undefined }],
  ])(
    '받을 수 없는 토큰(%s) → 400 invalid_request, 세션은 그대로',
    async (_name, over) => {
      const user = person();
      const s = await login(user);
      const res = await backchannel(
        issuer.logoutToken({ sub: user.sub, sid: s.sid, ...over }),
      );
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'invalid_request' });
      expect(await rowsOf(s.sid)).toBe(1);
    },
  );

  it('logout_token 칸이 없거나 JWT 가 아니면 400', async () => {
    for (const token of [undefined, 'not-a-jwt']) {
      const res = await backchannel(token);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'invalid_request' });
    }
  });

  it('CSRF 면제는 이 경로뿐 — 같은 요청 모양의 다른 POST(refresh)는 여전히 403', async () => {
    const user = person();
    const s = await login(user);
    const res = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', s.cookie)
      .type('form')
      .send({ logout_token: tokenFor(user, s.sid) });
    expect(res.status).toBe(403);
    expect(await rowsOf(s.sid)).toBe(1);
  });

  describe('회전과 경합 (보안 검토 M1)', () => {
    it('지우기와 경합한 회전이 끝난 sid 로 새 행을 남겨도(묘비) 그 행은 회전하지 못하고 지워진다', async () => {
      const user = person();
      const s = await login(user);
      expect((await backchannel(tokenFor(user, s.sid))).status).toBe(200);

      // 회전의 「새 행 만들기」가 로그아웃의 지우기 뒤에 떨어진 것처럼 — 같은 sid 의 행을 직접 남긴다
      const row = await prisma.user.findUnique({
        where: { ssoSubject: user.sub },
      });
      const raced = randomUUID();
      await CreateRefreshTokenCommand(
        prisma,
        row!.id,
        raced,
        new Date(Date.now() + 86_400_000),
        undefined,
        undefined,
        s.sid,
      );
      const res = await refresh(`refresh_token=${raced}`);
      expect(res.res.status).toBe(401);
      expect(await rowsOf(s.sid)).toBe(0);
      expect(await prisma.oidcRevokedSid.count({ where: { sid: s.sid } })).toBe(
        1,
      );
    });

    it('묘비의 sub 가 행 주인과 다르면 막지 않는다 (sid 가 겹친 남의 세션)', async () => {
      const user = person();
      const s = await login(user);
      await prisma.oidcRevokedSid.create({
        data: {
          sid: s.sid,
          sub: randomUUID(),
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });
      expect((await refresh(s.cookie)).res.status).toBe(201);
    });

    it('sid 와 sub 가 둘 다 오면 둘 다 맞는 행만 지운다 (보안 검토 L4)', async () => {
      const user = person();
      const s = await login(user);
      const res = await backchannel(
        issuer.logoutToken({ sub: randomUUID(), sid: s.sid }),
      );
      expect(res.status).toBe(200);
      expect(await rowsOf(s.sid)).toBe(1);
    });

    it('sub 로 모든 세션을 끝낸 시각(sessionsRevokedAt)보다 먼저 만든 행은 회전하지 못한다', async () => {
      const user = person();
      const s = await login(user);
      await prisma.user.update({
        where: { ssoSubject: user.sub },
        data: { sessionsRevokedAt: new Date() },
      });
      expect((await refresh(s.cookie)).res.status).toBe(401);
      expect(await rowsOf(s.sid)).toBe(0);
      // 그 뒤의 새 로그인은 산다
      const again = await login(user);
      expect((await refresh(again.cookie)).res.status).toBe(201);
    });

    it('같은 refresh 쿠키를 동시에 두 번 → 하나만 회전한다(새 행 하나)', async () => {
      const user = person();
      const s = await login(user);
      const send = await prepareRefresh(s.cookie);
      const results = await Promise.all([send(), send()]);
      expect(results.map((r) => r.res.status).sort()).toEqual([201, 401]);
      // 옛 행(회전 표시) + 새 행 하나
      expect(await rowsOf(s.sid)).toBe(2);
    });

    it('refresh 와 back-channel 로그아웃을 같은 순간에 → 어느 쪽이 먼저든 그 sid 의 세션은 남지 않는다', async () => {
      for (let i = 0; i < 5; i++) {
        const user = person();
        const s = await login(user);
        const send = await prepareRefresh(s.cookie);
        const [rotated, logout] = await Promise.all([
          send(),
          backchannel(tokenFor(user, s.sid)),
        ]);
        expect(logout.status).toBe(200);
        expect([201, 401]).toContain(rotated.res.status);
        expect(await rowsOf(s.sid)).toBe(0);
        expect((await refresh(rotated.cookie)).res.status).toBe(401);
      }
    });
  });
});
