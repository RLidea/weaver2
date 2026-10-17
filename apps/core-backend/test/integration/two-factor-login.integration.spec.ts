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
          create: { password: await bcrypt.hash(TEST_PASSWORD, 10) },
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
      method: 'get' | 'post',
      path: string,
      body?: object,
    ) => {
      const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
      const req = request(app.getHttpServer())
        [method](path)
        .set('Cookie', cookie);
      const res = await (method === 'post'
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

  it('정지된 계정도 비밀번호가 틀리면 정지 사실을 말하지 않는다', async () => {
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
    expect(right.status).toBe(401);
    expect(JSON.stringify(right.body)).toMatch(/suspended/i);
  });
});
