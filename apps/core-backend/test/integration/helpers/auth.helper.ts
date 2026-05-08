import request from 'supertest';
import { INestApplication } from '@nestjs/common';

export async function getCsrfToken(
  app: INestApplication,
): Promise<{ token: string; cookies: string }> {
  const res = await request(app.getHttpServer()).get('/v1/auth/csrf-token');
  const setCookie = res.headers['set-cookie'] as unknown as
    | string[]
    | undefined;
  const cookies = setCookie?.join('; ') ?? '';
  const token =
    (res.body as { data?: { csrfToken?: string } }).data?.csrfToken ?? '';
  return { token, cookies };
}

export async function loginAs(
  app: INestApplication,
  email: string,
  password: string,
) {
  const { token, cookies } = await getCsrfToken(app);
  return request(app.getHttpServer())
    .post('/v1/auth/sign-in')
    .set('Cookie', cookies)
    .set('x-csrf-token', token)
    .send({ email, password });
}

/** 로그인 후 auth 쿠키 문자열 반환 */
export async function getAuthCookies(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await loginAs(app, email, password);
  const setCookie = res.headers['set-cookie'] as unknown as
    | string[]
    | undefined;
  return setCookie?.join('; ') ?? '';
}
