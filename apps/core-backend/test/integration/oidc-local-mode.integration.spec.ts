/**
 * AUTH_MODE=local(기본)에서 SSO 경로는 닫혀 있고, 로그아웃 응답에 endSessionUrl 이 없다.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp } from './helpers/test-app.helper';
import { getCsrfToken } from './helpers/auth.helper';

describe('SSO routes in AUTH_MODE=local (Integration)', () => {
  let app: INestApplication;
  let saved: string | undefined;

  beforeAll(async () => {
    saved = process.env.AUTH_MODE;
    process.env.AUTH_MODE = 'local';
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
    if (saved === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = saved;
  });

  it.each(['/v1/auth/oidc/start', '/v1/auth/oidc/callback?state=x&code=y'])(
    '%s → 404 AUTH_MODE_LOCAL',
    async (path) => {
      const res = await request(app.getHttpServer()).get(path);
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).toContain('AUTH_MODE_LOCAL');
    },
  );

  it.each(['/v1/auth/oidc/start', '/v1/auth/oidc/callback'])(
    '스로틀이 켜져도 %s 의 31번째는 500 이 아니라 429 (실패 주소가 없다)',
    async (path) => {
      const throttle = process.env.THROTTLE_DISABLED;
      process.env.THROTTLE_DISABLED = 'false';
      try {
        const server = app.getHttpServer();
        for (let i = 0; i < 30; i++) {
          expect((await request(server).get(path)).status).toBe(404);
        }
        const res = await request(server).get(path);
        expect(res.status).toBe(429);
        expect(res.body).toMatchObject({
          success: false,
          error: { code: 429 },
        });
      } finally {
        process.env.THROTTLE_DISABLED = throttle;
      }
    },
  );

  it('back-channel 로그아웃 POST(쿠키 · CSRF 토큰 없음) → CSRF 403 이 아니라 404 AUTH_MODE_LOCAL', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/oidc/backchannel-logout')
      .type('form')
      .send({ logout_token: 'x.y.z' });
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).toContain('AUTH_MODE_LOCAL');
  });

  it('로그아웃 응답에 endSessionUrl 이 없다', async () => {
    const { token, cookies } = await getCsrfToken(app);
    const res = await request(app.getHttpServer())
      .post('/v1/auth/sign-out')
      .set('Cookie', cookies)
      .set('x-csrf-token', token);
    expect(res.status).toBe(201);
    expect(res.body.data).not.toHaveProperty('endSessionUrl');
  });

  it('공급자 응답은 sso: false, password: true', async () => {
    const res = await request(app.getHttpServer()).get('/v1/auth/providers');
    expect(res.body.data).toMatchObject({ sso: false, password: true });
  });
});
