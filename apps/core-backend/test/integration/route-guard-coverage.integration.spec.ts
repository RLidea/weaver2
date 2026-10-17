/**
 * Route Guard Coverage Integration Tests
 *
 * 앱에 등록된 **모든 라우트**를 메타데이터에서 찾아, 실제 요청으로 두 가지를 잰다.
 * 1. `@Public()` 이 아닌 라우트는 토큰 없이 부르면 401
 * 2. `@RequirePermission()` 이 걸린 라우트는 권한 없는 사용자로 부르면 403
 *
 * 인증·권한은 전역 가드(APP_GUARD — auth.module.ts)가 맡는다. 컨트롤러에 `@UseGuards` 를
 * 덧붙였는지와 무관하게 이 시험이 통과해야 하고, 새 라우트가 생겨도 손대지 않고 덮는다.
 * 전역 가드 등록이 빠지면 여기서 한꺼번에 깨진다.
 */
import { INestApplication, RequestMethod } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@weaver2/prisma';
import { IS_PUBLIC_KEY } from '@weaver2/common/decorator/public.decorator';
import { PERMISSIONS_KEY } from '../../src/core/permission/decorators/require-permission.decorator';
import {
  createTestApp,
  closeTestApp,
  getTestingModule,
} from './helpers/test-app.helper';
import { loginAs } from './helpers/auth.helper';

const TEST_PASSWORD = 'TestPass1234!';
// 경로 변수 자리. 가드는 파이프(검증)보다 먼저 돌므로 값의 형식은 결과에 영향이 없다.
const PARAM_PLACEHOLDER = '00000000-0000-4000-8000-000000000000';
// @nestjs/common/constants 의 값. 그 서브경로를 import 하면 jest 가 @nestjs/common 을
// 한 벌 더 올려 DI 가 깨지므로(주입이 undefined) 값을 옮겨 적는다.
const PATH_METADATA = 'path';
const METHOD_METADATA = 'method';
const VERSION_METADATA = '__version__';

interface Route {
  method: string;
  path: string;
  isPublic: boolean;
  permissions: string[] | undefined;
}

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

function joinPath(...parts: (string | undefined)[]): string {
  const joined = parts
    .filter((p): p is string => !!p)
    .map((p) => p.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return `/${joined}`.replace(/:[A-Za-z0-9_]+/g, PARAM_PLACEHOLDER);
}

function firstVersion(value: unknown): string | undefined {
  const v = Array.isArray(value) ? (value as unknown[])[0] : value;
  return typeof v === 'string' ? v : undefined;
}

function collectRoutes(app: INestApplication): Route[] {
  const routes: Route[] = [];
  const modules = app.get(ModulesContainer);
  for (const moduleRef of modules.values()) {
    for (const wrapper of moduleRef.controllers.values()) {
      const controller = wrapper.metatype as
        (new (...args: unknown[]) => unknown) | undefined;
      if (!controller) continue;
      const ctrlPaths = ([] as string[]).concat(
        (Reflect.getMetadata(PATH_METADATA, controller) as string | string[]) ??
          '',
      );
      const ctrlVersion = firstVersion(
        Reflect.getMetadata(VERSION_METADATA, controller),
      );
      const ctrlPublic = Reflect.getMetadata(IS_PUBLIC_KEY, controller) as
        boolean | undefined;
      const ctrlPerms = Reflect.getMetadata(PERMISSIONS_KEY, controller) as
        string[] | undefined;

      const proto = controller.prototype as Record<string, unknown>;
      for (const name of Object.getOwnPropertyNames(proto)) {
        if (name === 'constructor') continue;
        // 디스크립터로 읽는다 — proto[name] 은 getter 를 인스턴스 없이 실행해 버린다
        const handler = Object.getOwnPropertyDescriptor(proto, name)
          ?.value as unknown;
        if (typeof handler !== 'function') continue;
        const methodPath = Reflect.getMetadata(PATH_METADATA, handler) as
          string | string[] | undefined;
        if (methodPath === undefined) continue;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        if (method === undefined) continue;
        const version =
          firstVersion(Reflect.getMetadata(VERSION_METADATA, handler)) ??
          ctrlVersion;
        const handlerPublic = Reflect.getMetadata(IS_PUBLIC_KEY, handler) as
          boolean | undefined;
        const handlerPerms = Reflect.getMetadata(PERMISSIONS_KEY, handler) as
          string[] | undefined;

        for (const ctrlPath of ctrlPaths) {
          for (const mPath of ([] as string[]).concat(methodPath)) {
            routes.push({
              method: RequestMethod[method].toLowerCase(),
              path: joinPath(
                version ? `v${version}` : undefined,
                ctrlPath,
                mPath,
              ),
              // 가드와 같은 우선순위 — 핸들러가 클래스를 덮는다 (getAllAndOverride)
              isPublic: (handlerPublic ?? ctrlPublic) === true,
              permissions: handlerPerms ?? ctrlPerms,
            });
          }
        }
      }
    }
  }
  return routes;
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
        localCredential: {
          create: {
            password: await bcrypt.hash(TEST_PASSWORD, 10),
            isVerified: true,
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
});
