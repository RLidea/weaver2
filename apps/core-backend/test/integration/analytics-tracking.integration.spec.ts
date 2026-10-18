/**
 * 공개 페이지뷰 트래킹 — 누가(userId) · 어디서(IP) · 무엇으로(User-Agent)는 본문으로 받지 않는다.
 * 받으면 누구나 남의 userId 로 기록을 남길 수 있다. 세션과 요청에서만 읽는다.
 */
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import { getAuthCookies, getCsrfToken } from './helpers/auth.helper';

const PASSWORD = 'TestPass1234!';

describe('Analytics tracking — 공개 끝점 (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookies = '';
  let csrf = { token: '', cookies: '' };
  // 로그인한 요청의 CSRF 토큰은 그 세션으로 받는다
  let signedInCsrf = { token: '', cookies: '' };
  let userId = '';
  let victimId = '';
  const tag = `tracking_${Date.now()}`;
  const page = (n: string) => `/${tag}/${n}`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    const make = async (name: string) =>
      prisma.user.create({
        data: {
          email: `${name}@integration-test.local`,
          username: name,
          displayName: name,
          emailVerifiedAt: new Date(),
          localCredential: {
            create: { passwordHash: await bcrypt.hash(PASSWORD, 4) },
          },
        },
      });
    const user = await make(`${tag}_me`);
    const victim = await make(`${tag}_victim`);
    userId = user.id;
    victimId = victim.id;
    csrf = await getCsrfToken(app);
    cookies = await getAuthCookies(
      app,
      `${tag}_me@integration-test.local`,
      PASSWORD,
    );
    const res = await request(app.getHttpServer())
      .get('/v1/auth/csrf-token')
      .set('Cookie', cookies);
    signedInCsrf = {
      token: (res.body as { data: { csrfToken: string } }).data.csrfToken,
      cookies: (
        (res.headers['set-cookie'] as unknown as string[] | undefined) ?? []
      ).join('; '),
    };
  });

  afterAll(async () => {
    await prisma.pageView.deleteMany({
      where: { pageUrl: { startsWith: `/${tag}/` } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [userId, victimId] } } });
    await closeTestApp();
  });

  // 공개 끝점이어도 POST 는 CSRF 를 거친다
  function post(path: string, { signedIn = false } = {}) {
    const c = signedIn ? signedInCsrf : csrf;
    return request(app.getHttpServer())
      .post(`/v1/analytics/tracking/${path}`)
      .set('Cookie', signedIn ? `${c.cookies}; ${cookies}` : c.cookies)
      .set('x-csrf-token', c.token);
  }

  it('본문의 userId · ipAddress · userAgent 는 받지 않는다 (422)', async () => {
    await post('page-view')
      .send({ pageUrl: page('spoof'), userId: victimId })
      .expect(422);
    await post('page-view')
      .send({ pageUrl: page('spoof'), ipAddress: '1.2.3.4' })
      .expect(422);
    expect(await prisma.pageView.count({ where: { userId: victimId } })).toBe(
      0,
    );
  });

  it('비로그인이면 익명으로 남는다', async () => {
    const res = await post('page-view')
      .send({ pageUrl: page('anon') })
      .expect(200);
    expect(res.body.data).toEqual({});
    const row = await prisma.pageView.findFirstOrThrow({
      where: { pageUrl: page('anon') },
    });
    expect(row.userId).toBeNull();
  });

  it('로그인했으면 그 세션의 사용자로 남는다', async () => {
    await post('page-view', { signedIn: true })
      .set('User-Agent', 'tracking-test-agent')
      .send({ pageUrl: page('me') })
      .expect(200);
    const row = await prisma.pageView.findFirstOrThrow({
      where: { pageUrl: page('me') },
    });
    expect(row.userId).toBe(userId);
    expect(row.userAgent).toBe('tracking-test-agent');
  });

  it('bulk — 개수만 돌려주고, 배열이 아니거나 100개를 넘으면 422', async () => {
    const res = await post('bulk-page-views')
      .send({ pageViews: [{ pageUrl: page('b1') }, { pageUrl: page('b2') }] })
      .expect(200);
    expect(res.body.data).toEqual({ processed: 2, failed: 0 });

    await post('bulk-page-views').send({ pageViews: 'nope' }).expect(422);
    await post('bulk-page-views')
      .send({
        pageViews: Array.from({ length: 101 }, (_, i) => ({
          pageUrl: page(`x${i}`),
        })),
      })
      .expect(422);
    await post('bulk-page-views')
      .send({ pageViews: [{ pageUrl: page('b3'), userId: victimId }] })
      .expect(422);
  });
});
