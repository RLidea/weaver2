/**
 * Route Guard Coverage Integration Tests
 *
 * 앱에 등록된 **모든 라우트**를 메타데이터에서 찾아, 실제 요청으로 두 가지를 잰다.
 * 1. `@Public()` 이 아닌 라우트는 토큰 없이 부르면 401
 * 2. `@RequirePermission()` 이 걸린 라우트는 권한 없는 사용자로 부르면 403
 * 3. `@ApiTokenScope` 경로는 `@RequirePermission`(또는 `@AnySessionUser()`)과 짝을 이루고, 핸들러에만 붙는다
 * 4. `@SsoOnly()` 경로는 local(기본)에서 CSRF 토큰이 없어도 404 `AUTH_MODE_LOCAL` — 서버 간 면제 경로
 *    (back-channel 로그아웃)가 local 에서 열려 있지 않다
 *
 * 인증·권한은 전역 가드(APP_GUARD — auth.module.ts)가 맡는다. 컨트롤러에 `@UseGuards` 를
 * 덧붙였는지와 무관하게 이 시험이 통과해야 하고, 새 라우트가 생겨도 손대지 않고 덮는다.
 * 전역 가드 등록이 빠지면 여기서 한꺼번에 깨진다.
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
import { loginAs } from './helpers/auth.helper';
import {
  collectRoutes,
  Route,
  scopedRouteViolations,
} from './helpers/route-metadata.helper';

const TEST_PASSWORD = 'TestPass1234!';

/** Set-Cookie 헤더들을 `name=value; name=value` 로 합친다 — 뒤에 온 같은 이름이 이긴다 */
function mergeCookies(...headers: (string[] | undefined)[]): string {
  const jar = new Map<string, string>();
  for (const header of headers) {
    for (const line of header ?? []) {
      const pair = line.split(';')[0];
      const eq = pair.indexOf('=');
      if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
    }
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
}

function cookieHeaderToSetCookie(cookie: string): string[] {
  return cookie.split(';').map((c) => c.trim());
}

describe('Route Guard Coverage (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let routes: Route[];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    routes = collectRoutes(app);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await closeTestApp();
  });

  /** CSRF 토큰을 받아 쿠키와 함께 돌려준다 — 세션 식별자가 refresh_token 이라 로그인 뒤엔 새로 받는다 */
  async function csrfFor(cookie: string) {
    const res = await request(app.getHttpServer())
      .get('/v1/auth/csrf-token')
      .set('Cookie', cookie);
    const token =
      (res.body as { data?: { csrfToken?: string } }).data?.csrfToken ?? '';
    const merged = mergeCookies(
      cookieHeaderToSetCookie(cookie),
      res.headers['set-cookie'] as unknown as string[] | undefined,
    );
    return { token, cookie: merged };
  }

  function send(route: Route, csrf: { token: string; cookie: string }) {
    const server = app.getHttpServer();
    const req = (
      request(server) as unknown as Record<
        string,
        (path: string) => request.Test
      >
    )[route.method](route.path);
    return req.set('Cookie', csrf.cookie).set('x-csrf-token', csrf.token);
  }

  it('라우트를 실제로 찾아냈다 — 0개로 통과하는 빈 시험이 아니다', () => {
    expect(routes.filter((r) => !r.isPublic).length).toBeGreaterThan(50);
    expect(routes.filter((r) => r.permissions?.length).length).toBeGreaterThan(
      10,
    );
  });

  it('@Public 이 아닌 모든 라우트는 토큰 없이 부르면 401', async () => {
    const csrf = await csrfFor('');
    const mismatches: string[] = [];
    for (const route of routes.filter((r) => !r.isPublic)) {
      const res = await send(route, csrf);
      if (res.status !== 401) {
        mismatches.push(
          `${route.method.toUpperCase()} ${route.path} → ${res.status}`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('@RequirePermission 이 걸린 모든 라우트는 권한 없는 사용자에게 403', async () => {
    const email = `noperm_${Date.now()}@integration-test.local`;
    const user = await prisma.user.create({
      data: {
        email,
        username: email.split('@')[0],
        displayName: email.split('@')[0],
        emailVerifiedAt: new Date(),
        localCredential: {
          create: {
            passwordHash: await bcrypt.hash(TEST_PASSWORD, 10),
          },
        },
      },
    });
    createdUserIds.push(user.id);
    const login = await loginAs(app, email, TEST_PASSWORD);
    expect(login.status).toBe(201);
    const csrf = await csrfFor(
      mergeCookies(login.headers['set-cookie'] as unknown as string[]),
    );

    const mismatches: string[] = [];
    for (const route of routes.filter(
      (r) => !r.isPublic && r.permissions?.length,
    )) {
      const res = await send(route, csrf);
      if (res.status !== 403) {
        mismatches.push(
          `${route.method.toUpperCase()} ${route.path} [${route.permissions!.join(',')}] → ${res.status}`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('@SsoOnly 경로는 모두 local 에서 404 AUTH_MODE_LOCAL — CSRF 토큰 없이 불러도', async () => {
    const ssoOnly = routes.filter((r) => r.authModeOnly === 'sso');
    // start · callback · back-channel 로그아웃
    expect(ssoOnly.length).toBeGreaterThanOrEqual(3);
    const mismatches: string[] = [];
    for (const route of ssoOnly) {
      const res = await (
        request(app.getHttpServer()) as unknown as Record<
          string,
          (path: string) => request.Test
        >
      )[route.method](route.path);
      if (
        res.status !== 404 ||
        !JSON.stringify(res.body).includes('AUTH_MODE_LOCAL')
      ) {
        mismatches.push(
          `${route.method.toUpperCase()} ${route.path} → ${res.status}`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  describe('범위 경로의 모양', () => {
    const base: Route = {
      method: 'post',
      path: '/v1/x',
      isPublic: false,
      permissions: undefined,
      apiTokenScope: undefined,
      classApiTokenScope: undefined,
      anySessionUser: false,
      authModeOnly: undefined,
    };

    it('앱의 모든 @ApiTokenScope 경로가 @RequirePermission(또는 @AnySessionUser)과 짝이고, 클래스에 붙은 것이 없다', () => {
      expect(scopedRouteViolations(routes)).toEqual([]);
    });

    it('검사기 자체: 권한 없는 범위 경로 · 클래스 범위를 잡고, 짝을 이룬 경로는 통과시킨다', () => {
      expect(
        scopedRouteViolations([{ ...base, apiTokenScope: 'a:b' }]),
      ).toHaveLength(1);
      expect(
        scopedRouteViolations([{ ...base, classApiTokenScope: 'a:b' }]),
      ).toHaveLength(1);
      expect(
        scopedRouteViolations([
          { ...base, apiTokenScope: 'a:b', permissions: ['board:manage'] },
          { ...base, apiTokenScope: 'a:b', anySessionUser: true },
          base,
        ]),
      ).toEqual([]);
    });
  });
});
