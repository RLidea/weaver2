/**
 * Two-Factor Login Integration Tests
 *
 * 비밀번호 + 이메일 2FA 로그인을 HTTP 로 끝까지 돈다. pre-auth 토큰은 응답 본문이 아니라
 * pre_auth 쿠키로만 오가고, 2FA 를 통과한 뒤에도 탈퇴·정지를 다시 본다.
 * 메일 발송은 가로채 코드를 읽는다(SMTP 를 띄우지 않는다).
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@weaver2/prisma';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import { getCsrfToken } from './helpers/auth.helper';
import { EmailBusinessService } from '../../src/infrastructure/email/services/email-business.service';

const TEST_PASSWORD = 'TestPass1234!';

function cookieMap(setCookie: string[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of setCookie ?? []) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    map.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
  }
  return map;
}

describe('Two-Factor Login (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sentCodes: string[];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    jest
      .spyOn(
        getTestingModule().get(EmailBusinessService),
        'sendTwoFactorCodeEmail',
      )
      .mockImplementation((_to: string, code: string) => {
        sentCodes.push(code);
        return Promise.resolve(undefined as never);
      });
  });

  beforeEach(() => {
    sentCodes = [];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await closeTestApp();
  });

  async function createUserWithEmail2fa() {
    const name = `tfl_${Date.now()}_${createdUserIds.length}`;
    const user = await prisma.user.create({
      data: {
        email: `${name}@integration-test.local`,
        username: name,
        displayName: name,
        emailVerifiedAt: new Date(),
        localCredential: {
          create: { passwordHash: await bcrypt.hash(TEST_PASSWORD, 10) },
        },
        twoFactorMethods: {
          create: { kind: 'EMAIL', confirmedAt: new Date() },
        },
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  /** CSRF 쿠키 + 지금까지 받은 쿠키를 들고 다니는 작은 브라우저 */
  async function browser() {
    const { token, cookies } = await getCsrfToken(app);
    const jar = cookieMap(cookies.split('; '));
    const send = async (
      method: 'get' | 'post' | 'delete',
      path: string,
      body?: object,
    ) => {
      const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
      const req = request(app.getHttpServer())
        [method](path)
        .set('Cookie', cookie);
      const res = await (method !== 'get'
        ? req.set('x-csrf-token', token).send(body ?? {})
        : req);
      for (const [k, v] of cookieMap(
        res.headers['set-cookie'] as unknown as string[] | undefined,
      )) {
        if (v === '') jar.delete(k);
        else jar.set(k, v);
      }
      return res;
    };
    return { send, jar };
  }

  it('로그인을 끝낸 pre_auth 토큰은 다시 쓸 수 없다', async () => {
    const user = await createUserWithEmail2fa();
    const b = await browser();
    await b.send('post', '/v1/auth/sign-in', {
      email: user.email,
      password: TEST_PASSWORD,
    });
    const usedPreAuth = b.jar.get('pre_auth');
    expect(usedPreAuth).toBeTruthy();
    await b.send('post', '/v1/auth/2fa/email/send');
    const done = await b.send('post', '/v1/auth/2fa/authenticate', {
      method: 'email',
      code: sentCodes[0],
    });
    expect(done.status).toBe(201);

    // 훔친(또는 남은) pre_auth 만 든 다른 브라우저로 다시 — 코드를 보기 전에 토큰에서 거절된다
    const attacker = await browser();
    attacker.jar.set('pre_auth', usedPreAuth!);
    const replay = await attacker.send('post', '/v1/auth/2fa/authenticate', {
      method: 'email',
      code: '000000',
    });
    expect(replay.status).toBe(401);
    expect(JSON.stringify(replay.body)).toContain('pre-auth token');
  });

  it('비밀번호 → pre_auth 쿠키 → 코드 발송 → 2FA 통과 → 세션 쿠키', async () => {
    const user = await createUserWithEmail2fa();
    const b = await browser();

    const signIn = await b.send('post', '/v1/auth/sign-in', {
      email: user.email,
      password: TEST_PASSWORD,
    });
    expect(signIn.status).toBe(201);
    const body = signIn.body as { data: Record<string, unknown> };
    expect(body.data.twoFactorRequired).toBe(true);
    expect(body.data).not.toHaveProperty('preAuthToken');
    expect(b.jar.has('pre_auth')).toBe(true);
    expect(b.jar.has('access_token')).toBe(false);

    const pending = await b.send('get', '/v1/auth/2fa/pending');
    expect(pending.status).toBe(200);
    expect(
      (pending.body as { data: { availableMethods: object } }).data
        .availableMethods,
    ).toEqual({ totp: false, email: true });

    expect((await b.send('post', '/v1/auth/2fa/email/send')).status).toBe(201);
    expect(sentCodes).toHaveLength(1);

    const done = await b.send('post', '/v1/auth/2fa/authenticate', {
      method: 'email',
      code: sentCodes[0],
    });
    expect(done.status).toBe(201);
    expect(b.jar.has('access_token')).toBe(true);
    expect(b.jar.has('pre_auth')).toBe(false);

    const me = await b.send('get', '/v1/users/me');
    expect(me.status).toBe(200);
  });

  it('pre_auth 쿠키 없이는 2FA 단계를 밟을 수 없다', async () => {
    const b = await browser();
    expect((await b.send('get', '/v1/auth/2fa/pending')).status).toBe(401);
    expect(
      (
        await b.send('post', '/v1/auth/2fa/authenticate', {
          method: 'email',
          code: '000000',
        })
      ).status,
    ).toBe(401);
  });

  it('pre_auth 토큰을 access_token 자리에 넣어도 로그인한 것이 되지 않는다', async () => {
    const user = await createUserWithEmail2fa();
    const b = await browser();
    await b.send('post', '/v1/auth/sign-in', {
      email: user.email,
      password: TEST_PASSWORD,
    });

    b.jar.set('access_token', b.jar.get('pre_auth')!);
    expect((await b.send('get', '/v1/users/me')).status).toBe(401);
  });

  it('pre-auth 대기 중에 정지되면 2FA 를 통과해도 세션을 주지 않는다', async () => {
    const user = await createUserWithEmail2fa();
    const b = await browser();
    await b.send('post', '/v1/auth/sign-in', {
      email: user.email,
      password: TEST_PASSWORD,
    });
    await b.send('post', '/v1/auth/2fa/email/send');
    await prisma.user.update({
      where: { id: user.id },
      data: { suspendedUntil: new Date(Date.now() + 60 * 60_000) },
    });

    const done = await b.send('post', '/v1/auth/2fa/authenticate', {
      method: 'email',
      code: sentCodes[0],
    });
    expect(done.status).toBe(401);
    expect(b.jar.has('access_token')).toBe(false);
  });

  it('2FA 가 켜진 정지 계정은 비밀번호만으로는 정지 사실을 듣지 못한다 — 2FA 뒤에야 거절', async () => {
    const user = await createUserWithEmail2fa();
    await prisma.user.update({
      where: { id: user.id },
      data: { suspendedUntil: new Date(Date.now() + 60 * 60_000) },
    });
    const b = await browser();

    const wrong = await b.send('post', '/v1/auth/sign-in', {
      email: user.email,
      password: 'WrongPass0000!',
    });
    expect(wrong.status).toBe(401);
    expect(JSON.stringify(wrong.body)).not.toMatch(/suspended/i);

    const right = await b.send('post', '/v1/auth/sign-in', {
      email: user.email,
      password: TEST_PASSWORD,
    });
    expect(right.status).toBe(201);
    expect(JSON.stringify(right.body)).not.toMatch(/suspended/i);

    await b.send('post', '/v1/auth/2fa/email/send');
    const done = await b.send('post', '/v1/auth/2fa/authenticate', {
      method: 'email',
      code: sentCodes[0],
    });
    expect(done.status).toBe(401);
    expect(JSON.stringify(done.body)).toMatch(/suspended/i);
  });

  it('로그인 유지(rememberMe)는 2FA 를 거쳐도 이어진다 — 리프레시 쿠키 30일', async () => {
    const user = await createUserWithEmail2fa();
    const b = await browser();
    await b.send('post', '/v1/auth/sign-in', {
      email: user.email,
      password: TEST_PASSWORD,
      rememberMe: true,
    });
    await b.send('post', '/v1/auth/2fa/email/send');

    const done = await b.send('post', '/v1/auth/2fa/authenticate', {
      method: 'email',
      code: sentCodes[0],
    });
    const refresh = (done.headers['set-cookie'] as unknown as string[]).find(
      (c) => c.startsWith('refresh_token='),
    );
    const maxAge = Number(/Max-Age=(\d+)/.exec(refresh ?? '')?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(29 * 24 * 60 * 60);
  });

  it('쿠키로 들어와도 2FA 오답은 SECOND_FACTOR 로 세어 5번 뒤 잠긴다', async () => {
    const user = await createUserWithEmail2fa();
    const b = await browser();
    await b.send('post', '/v1/auth/sign-in', {
      email: user.email,
      password: TEST_PASSWORD,
    });
    await b.send('post', '/v1/auth/2fa/email/send');
    const wrong = sentCodes[0] === '000000' ? '000001' : '000000';

    for (let i = 0; i < 5; i++) {
      await b.send('post', '/v1/auth/2fa/authenticate', {
        method: 'email',
        code: wrong,
      });
    }
    const locked = await b.send('post', '/v1/auth/2fa/authenticate', {
      method: 'email',
      code: sentCodes[0],
    });
    expect(locked.status).toBe(401);
    expect(JSON.stringify(locked.body)).toMatch(/locked/i);
  });

  it('탈퇴한 계정은 비밀번호가 맞아도 계정 상태를 말하지 않는다', async () => {
    const user = await createUserWithEmail2fa();
    await prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });
    const b = await browser();

    const res = await b.send('post', '/v1/auth/sign-in', {
      email: user.email,
      password: TEST_PASSWORD,
    });
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).toMatch(/Invalid credentials/);
    expect(JSON.stringify(res.body)).not.toMatch(/DELETED/);
  });

  it('리프레시가 실패해도 2FA 대기(pre_auth)는 남는다 — 로그인 화면은 늘 리프레시 실패를 겪는다', async () => {
    const user = await createUserWithEmail2fa();
    const b = await browser();
    await b.send('post', '/v1/auth/sign-in', {
      email: user.email,
      password: TEST_PASSWORD,
    });

    // 세션이 없는 화면에서 apiClient 가 401 → 리프레시를 시도하는 상황
    expect((await b.send('post', '/v1/auth/refresh')).status).toBe(401);
    expect(b.jar.has('pre_auth')).toBe(true);
    expect((await b.send('get', '/v1/auth/2fa/pending')).status).toBe(200);
  });

  it('2FA 단계를 그만두면 pre_auth 가 지워지고 더는 2FA 단계를 밟을 수 없다', async () => {
    const user = await createUserWithEmail2fa();
    const b = await browser();
    await b.send('post', '/v1/auth/sign-in', {
      email: user.email,
      password: TEST_PASSWORD,
    });
    expect(b.jar.has('pre_auth')).toBe(true);

    // 대기 중인 브라우저에는 세션이 없어 로그아웃을 못 부른다 — 전용 엔드포인트로 그만둔다
    const res = await b.send('delete', '/v1/auth/2fa/pending');
    expect(res.status).toBe(200);
    expect(b.jar.has('pre_auth')).toBe(false);
    expect((await b.send('get', '/v1/auth/2fa/pending')).status).toBe(401);
  });
});
