/**
 * Public Write Routes (AUTH_MODE=sso) Integration Tests
 *
 * sso 로 앱을 띄우고, 메타데이터에서 모은 **`@Public` 이고 GET 이 아닌 모든 경로**가
 * ⓐ 허용 목록(`public-write-allowlist.ts` + 파생 프로젝트의 `PUBLIC_WRITE_ALLOWLIST_EXTRAS`)에
 * 있거나 ⓑ 404 `AUTH_MODE_SSO` 인지 잰다. 목록에 없는 새 공개 쓰기 경로가 생기면 빨개진다.
 * 정적 관리 뷰(`/admin/login`)가 sso 에서 로그인 칸 대신 안내를 내는지도 함께 본다.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import { collectRoutes, Route } from './helpers/route-metadata.helper';
import { getCsrfToken } from './helpers/auth.helper';
import {
  PUBLIC_WRITE_ALLOWLIST,
  PUBLIC_WRITE_ALLOWLIST_EXTRAS,
  isAllowlisted,
} from '../../src/core/auth/public-write-allowlist';

const SSO_ENV = {
  AUTH_MODE: 'sso',
  ACCOUNTS_OIDC_ISSUER: 'http://127.0.0.1:9/oidc',
  ACCOUNTS_OIDC_CLIENT_ID: 'test-client',
  ACCOUNTS_OIDC_CLIENT_SECRET: 'test-secret',
};

describe('Public write routes in AUTH_MODE=sso (Integration)', () => {
  let app: INestApplication;
  let routes: Route[];
  let allowlist: string[];
  const saved: Record<string, string | undefined> = {};

  beforeAll(async () => {
    for (const [k, v] of Object.entries(SSO_ENV)) {
      saved[k] = process.env[k];
      process.env[k] = v;
    }
    app = await createTestApp();
    routes = collectRoutes(app);
    let extras: string[] = [];
    try {
      extras = getTestingModule().get<string[]>(PUBLIC_WRITE_ALLOWLIST_EXTRAS, {
        strict: false,
      });
    } catch {
      // 파생 프로젝트가 더하지 않았다
    }
    allowlist = [...PUBLIC_WRITE_ALLOWLIST, ...extras];
  });

  afterAll(async () => {
    await closeTestApp();
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  // CSRF 미들웨어가 가드보다 먼저 돈다 — 토큰을 실어야 가드(404)까지 닿는다
  function send(route: Route, csrf: { token: string; cookies: string }) {
    return (
      request(app.getHttpServer()) as unknown as Record<
        string,
        (path: string) => request.Test
      >
    )
      [route.method](route.path)
      .set('Cookie', csrf.cookies)
      .set('x-csrf-token', csrf.token);
  }

  const publicWrites = () =>
    routes.filter((r) => r.isPublic && r.method !== 'get');

  it('공개 쓰기 경로를 실제로 찾아냈다 — 빈 시험이 아니다', () => {
    expect(publicWrites().length).toBeGreaterThan(10);
  });

  it('허용 목록의 줄은 모두 지금 앱에 있는 경로다 — 낡은 줄이 남지 않는다', () => {
    const stale = PUBLIC_WRITE_ALLOWLIST.filter(
      (entry) =>
        !publicWrites().some((r) => isAllowlisted([entry], r.method, r.path)),
    );
    expect(stale).toEqual([]);
  });

  it('@Public 비-GET 경로는 모두 허용 목록에 있거나 404 AUTH_MODE_SSO', async () => {
    const csrf = await getCsrfToken(app);
    const mismatches: string[] = [];
    for (const route of publicWrites()) {
      if (isAllowlisted(allowlist, route.method, route.path)) continue;
      const res = await send(route, csrf);
      if (
        res.status !== 404 ||
        !JSON.stringify(res.body).includes('AUTH_MODE_SSO')
      ) {
        mismatches.push(
          `${route.method.toUpperCase()} ${route.path} → ${res.status}`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('로컬 전용 GET(2FA 대기 · OAuth 시작)도 닫힌다', async () => {
    const server = app.getHttpServer();
    for (const path of ['/v1/auth/2fa/pending', '/v1/auth/oauth/google']) {
      const res = await request(server).get(path);
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).toContain('AUTH_MODE_SSO');
    }
  });

  it('공급자 응답은 sso: true, 로컬 수단은 모두 false', async () => {
    const res = await request(app.getHttpServer()).get('/v1/auth/providers');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      sso: true,
      password: false,
      google: false,
      kakao: false,
      naver: false,
      apple: false,
    });
  });

  it('정적 관리 뷰 /admin/login 은 로그인 칸 대신 프런트 로그인으로 안내한다', async () => {
    const res = await request(app.getHttpServer()).get('/admin/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('/login?redirect=/admin');
    expect(res.text).not.toContain('loginForm');
    const reset = await request(app.getHttpServer()).get(
      '/admin/request-password-reset',
    );
    expect(reset.status).toBe(404);
  });
});
