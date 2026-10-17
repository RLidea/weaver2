/**
 * 비밀번호 재설정 주소 — 화면(@weaver2/auth)은 /v1/auth/password/* 를 부른다.
 * 컨트롤러에 version 이 빠져 /auth/password/* 로만 열려 있었고, 「비밀번호 찾기」·「재설정」이
 * 404 로 끝났다. 주소가 다시 어긋나지 않게 잰다.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp } from './helpers/test-app.helper';
import { getCsrfToken } from './helpers/auth.helper';

describe('Password reset route (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('POST /v1/auth/password/request-reset 이 열려 있다 (없는 주소여도 같은 200)', async () => {
    const { token, cookies } = await getCsrfToken(app);
    const res = await request(app.getHttpServer())
      .post('/v1/auth/password/request-reset')
      .set('Cookie', cookies)
      .set('x-csrf-token', token)
      .send({ email: `nobody_${Date.now()}@integration-test.local` });

    expect(res.status).toBe(200);
  });

  it('POST /v1/auth/password/reset 이 열려 있다 (틀린 토큰은 404 가 아니라 거절)', async () => {
    const { token, cookies } = await getCsrfToken(app);
    const res = await request(app.getHttpServer())
      .post('/v1/auth/password/reset')
      .set('Cookie', cookies)
      .set('x-csrf-token', token)
      .send({ token: 'no-such-token', password: 'abcd1234' });

    expect(res.status).not.toBe(404);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
