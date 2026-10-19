/**
 * API Tokens Integration Tests
 *
 * 범위 토큰의 가드 계약 셋을 실제 앱 · DB 로 잰다. 파생 프로젝트(RLidea R3 초안 경로)가 기댄다.
 * 1. 토큰은 `@ApiTokenScope` 가 붙은 경로에서만 인증된다 — 다른 경로는 (공개 경로까지) 401, 범위가 다르면 403
 * 2. 주인의 권한은 `@RequirePermission` 을 결코 채우지 못한다 — 경로 자신의 범위만 그 자리에 선다.
 *    세션은 지금처럼 그 권한이 있어야 한다
 * 3. 끊은 · 만료된 토큰은 401, 성공하면 `lastUsedAt` 을 갱신한다
 *
 * weaver2 는 범위 경로가 없으므로 시험 전용 컨트롤러를 얹은 앱으로 돈다.
 */
import {
  Controller,
  Get,
  INestApplication,
  Post,
  SetMetadata,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaService } from '@weaver2/prisma';
import { setNestApp } from '@weaver2/common/global/nest.config';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { CoreModule } from '../../src/core.module';
import { RequirePermission } from '../../src/core/permission/decorators/require-permission.decorator';
import {
  AnySessionUser,
  API_TOKEN_SCOPE_KEY,
  ApiTokenScope,
} from '../../src/core/auth/api-token/decorators/api-token-scope.decorator';
import {
  Actor,
  RequestActor,
} from '../../src/core/auth/api-token/decorators/actor.decorator';
import { getAuthCookies } from './helpers/auth.helper';
import { ensureSystemPermissionGroups } from './helpers/permission-group.helper';
import { collectRoutes } from './helpers/route-metadata.helper';

const TEST_PASSWORD = 'TestPass1234!';
const SCOPE = 'test:write';

/** 범위 경로의 모양 그대로 — 토큰은 범위로, 세션은 권한으로 */
@Controller({ path: 'token-probe', version: '1' })
class TokenProbeController {
  @ApiTokenScope(SCOPE)
  @RequirePermission(PERMISSIONS.ADMIN.ACCESS)
  @Get('scoped')
  read(@Actor() actor: RequestActor) {
    return actor;
  }

  @ApiTokenScope(SCOPE)
  @RequirePermission(PERMISSIONS.ADMIN.ACCESS)
  @Post('scoped')
  write(@Actor() actor: RequestActor) {
    return actor;
  }

  @ApiTokenScope(SCOPE)
  @AnySessionUser()
  @Get('scoped-any-session')
  anySession(@Actor() actor: RequestActor) {
    return actor;
  }

  @Get('plain')
  plain() {
    return 'plain';
  }

  @Public()
  @Get('open')
  open() {
    return 'open';
  }
}

/** 실수로 클래스에 범위를 붙인 컨트롤러 — 가드는 핸들러만 보므로 토큰에 열리지 않는다 */
@SetMetadata(API_TOKEN_SCOPE_KEY, SCOPE)
@Controller({ path: 'token-probe-class', version: '1' })
class ClassScopedProbeController {
  @Get()
  read() {
    return 'class';
  }
}

interface ApiTokenBody {
  id: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  user: { id: string };
}

describe('API Tokens (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tag = `apitok${Date.now()}`;
  const userIds: string[] = [];

  let owner: { id: string };
  let superOwner: { id: string };
  let superCookies: string;
  let adminCookies: string;
  let memberCookies: string;

  async function createUser(name: string, groupName?: string) {
    const user = await prisma.user.create({
      data: {
        email: `${tag}_${name}@integration-test.local`,
        username: `${tag}_${name}`,
        displayName: `${tag}_${name}`,
        emailVerifiedAt: new Date(),
        localCredential: {
          create: { passwordHash: await bcrypt.hash(TEST_PASSWORD, 10) },
        },
      },
    });
    userIds.push(user.id);
    if (groupName) {
      const group = await prisma.permissionGroup.findUniqueOrThrow({
        where: { name: groupName },
      });
      await prisma.userPermissionGroup.create({
        data: { userId: user.id, permissionGroupId: group.id },
      });
    }
    return user;
  }

  const cookiesOf = (name: string) =>
    getAuthCookies(app, `${tag}_${name}@integration-test.local`, TEST_PASSWORD);

  /** CSRF 토큰은 세션에 묶인다 — 로그인 쿠키를 들고 받는다 */
  async function adminPost(path: string, cookies: string, body: object = {}) {
    const csrf = await request(app.getHttpServer())
      .get('/v1/auth/csrf-token')
      .set('Cookie', cookies);
    const csrfCookie = (
      csrf.headers['set-cookie'] as unknown as string[] | undefined
    )?.join('; ');
    const token = (csrf.body as { data: { csrfToken: string } }).data.csrfToken;
    return request(app.getHttpServer())
      .post(path)
      .set('Cookie', `${csrfCookie ?? ''}; ${cookies}`)
      .set('x-csrf-token', token)
      .send(body);
  }

  async function issue(body: Partial<Record<string, unknown>> = {}) {
    const res = await adminPost('/v1/admin/api-tokens', superCookies, {
      userId: owner.id,
      name: '시험 토큰',
      scopes: [SCOPE],
      ...body,
    });
    expect(res.status).toBe(201);
    return (res.body as { data: { token: string; apiToken: ApiTokenBody } })
      .data;
  }

  const bearer = (method: 'get' | 'post', path: string, token: string) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule],
      controllers: [TokenProbeController, ClassScopedProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
    setNestApp(app);
    await app.init();

    prisma = moduleRef.get(PrismaService);
    await ensureSystemPermissionGroups(prisma);

    // 주인은 권한 그룹이 없다 — 서비스 계정의 모양(RLidea R3 의 노엘)
    owner = await createUser('owner');
    // 최고관리자 주인 — 그래도 그 권한은 토큰에 따라가지 않아야 한다
    superOwner = await createUser('superowner', 'SuperAdmin');
    await createUser('super', 'SuperAdmin');
    await createUser('admin', 'Admin');
    await createUser('member');
    superCookies = await cookiesOf('super');
    adminCookies = await cookiesOf('admin');
    memberCookies = await cookiesOf('member');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app?.close();
  });

  describe('발급 · 저장', () => {
    it('원문은 발급 응답에만 있고, DB 에는 sha256 해시만 있다', async () => {
      const { token, apiToken } = await issue();
      expect(token).toMatch(/^wvt_[0-9a-f]{12}_[0-9a-f]{64}$/);
      expect(token.startsWith(`${apiToken.prefix}_`)).toBe(true);

      const row = await prisma.apiToken.findUniqueOrThrow({
        where: { id: apiToken.id },
      });
      expect(row.tokenHash).toBe(
        createHash('sha256').update(token).digest('hex'),
      );
      expect(Object.values(row).map(String)).not.toContain(token);
    });

    it('목록에는 원문도 해시도 없다', async () => {
      const { token, apiToken } = await issue();
      const res = await request(app.getHttpServer())
        .get(`/v1/admin/api-tokens?userId=${owner.id}`)
        .set('Cookie', superCookies);
      expect(res.status).toBe(200);
      const text = JSON.stringify(res.body);
      const row = await prisma.apiToken.findUniqueOrThrow({
        where: { id: apiToken.id },
      });
      expect(text).toContain(apiToken.id);
      expect(text).not.toContain(token);
      expect(text).not.toContain(row.tokenHash);
      expect(text).not.toContain('tokenHash');
    });

    it('없는 주인이면 404, 형식이 어긋난 범위는 422(검증), 지난 만료는 400', async () => {
      const missing = await adminPost('/v1/admin/api-tokens', superCookies, {
        userId: '00000000-0000-4000-8000-000000000000',
        name: 'n',
        scopes: [SCOPE],
      });
      expect(missing.status).toBe(404);

      const badScope = await adminPost('/v1/admin/api-tokens', superCookies, {
        userId: owner.id,
        name: 'n',
        scopes: ['Blog Draft'],
      });
      expect(badScope.status).toBe(422);

      const past = await adminPost('/v1/admin/api-tokens', superCookies, {
        userId: owner.id,
        name: 'n',
        scopes: [SCOPE],
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      });
      expect(past.status).toBe(400);
    });
  });

  describe('가드 1 — 범위 경로에서만', () => {
    let token: string;

    beforeAll(async () => {
      token = (await issue()).token;
    });

    it('범위 경로는 통과하고, 주체는 TOKEN · 주인 id 다 (주인은 권한이 없다)', async () => {
      const res = await bearer('get', '/v1/token-probe/scoped', token);
      expect(res.status).toBe(200);
      expect((res.body as { data: RequestActor }).data).toEqual({
        userId: owner.id,
        kind: 'TOKEN',
      });
    });

    it('쓰기도 CSRF 토큰 없이 된다 (Bearer 면제)', async () => {
      const res = await bearer('post', '/v1/token-probe/scoped', token);
      expect(res.status).toBe(201);
    });

    it('범위가 없는 모든 경로는 정확히 401 — 공개 경로 · 권한 없는 경로 · 관리 경로 모두 (주인이 최고관리자여도)', async () => {
      const superToken = (await issue({ userId: superOwner.id })).token;
      const unscoped = collectRoutes(app).filter(
        (route) => !route.apiTokenScope,
      );
      expect(unscoped.some((route) => route.isPublic)).toBe(true);
      expect(unscoped.some((route) => !route.permissions?.length)).toBe(true);
      expect(
        unscoped.some((route) => route.path === '/v1/admin/api-tokens'),
      ).toBe(true);

      const mismatches: string[] = [];
      for (const route of unscoped) {
        const res = await (
          request(app.getHttpServer()) as unknown as Record<
            string,
            (path: string) => request.Test
          >
        )
          [route.method](route.path)
          .set('Authorization', `Bearer ${superToken}`);
        if (res.status !== 401) {
          mismatches.push(
            `${route.method.toUpperCase()} ${route.path} → ${res.status}`,
          );
        }
      }
      expect(mismatches).toEqual([]);
    });

    it('클래스에 붙은 범위로는 열리지 않는다 — 가드는 핸들러만 본다', async () => {
      const res = await bearer('get', '/v1/token-probe-class', token);
      expect(res.status).toBe(401);
    });

    it('범위가 다른 토큰은 403', async () => {
      const other = (await issue({ scopes: ['test:other'] })).token;
      const res = await bearer('get', '/v1/token-probe/scoped', other);
      expect(res.status).toBe(403);
    });
  });

  describe('가드 2 — 토큰은 범위로, 세션은 권한으로', () => {
    let token: string;

    beforeAll(async () => {
      token = (await issue()).token;
    });

    it('범위를 가진 토큰은 @RequirePermission 경로를 통과한다 — 주인에게 그 권한이 없어도', async () => {
      const permissions = await prisma.userPermissionGroup.count({
        where: { userId: owner.id },
      });
      expect(permissions).toBe(0);
      const res = await bearer('get', '/v1/token-probe/scoped', token);
      expect(res.status).toBe(200);
    });

    it('권한 없는 회원 세션은 같은 경로에서 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/token-probe/scoped')
        .set('Cookie', memberCookies);
      expect(res.status).toBe(403);
    });

    it('권한 있는 관리자 세션은 200 — 주체는 SESSION', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/token-probe/scoped')
        .set('Cookie', adminCookies);
      expect(res.status).toBe(200);
      expect((res.body as { data: RequestActor }).data.kind).toBe('SESSION');
    });

    it('@AnySessionUser 경로는 회원 세션 · 토큰 모두 통과', async () => {
      const session = await request(app.getHttpServer())
        .get('/v1/token-probe/scoped-any-session')
        .set('Cookie', memberCookies);
      const viaToken = await bearer(
        'get',
        '/v1/token-probe/scoped-any-session',
        token,
      );
      expect([session.status, viaToken.status]).toEqual([200, 200]);
    });

    it('토큰으로 토큰을 발급할 수 없다', async () => {
      const res = await bearer('post', '/v1/admin/api-tokens', token).send({
        userId: owner.id,
        name: 'n',
        scopes: [SCOPE],
      });
      expect(res.status).toBe(401);
    });
  });

  describe('가드 3 — 끊김 · 만료 · lastUsedAt', () => {
    it('성공하면 lastUsedAt 이 찍히고, 실패(범위 밖)하면 찍히지 않는다', async () => {
      const { token, apiToken } = await issue();
      expect(apiToken.lastUsedAt).toBeNull();

      await bearer('get', '/v1/token-probe/plain', token);
      const untouched = await prisma.apiToken.findUniqueOrThrow({
        where: { id: apiToken.id },
      });
      expect(untouched.lastUsedAt).toBeNull();

      await bearer('get', '/v1/token-probe/scoped', token).expect(200);
      const touched = await prisma.apiToken.findUniqueOrThrow({
        where: { id: apiToken.id },
      });
      expect(touched.lastUsedAt).toBeInstanceOf(Date);
    });

    it('끊은 토큰은 401 — 다시 끊어도 처음 시각이 남는다', async () => {
      const { token, apiToken } = await issue();
      const first = await adminPost(
        `/v1/admin/api-tokens/${apiToken.id}/revoke`,
        superCookies,
      );
      expect(first.status).toBe(200);
      const revokedAt = (first.body as { data: ApiTokenBody }).data.revokedAt;
      expect(revokedAt).not.toBeNull();

      const res = await bearer('get', '/v1/token-probe/scoped', token);
      expect(res.status).toBe(401);

      const again = await adminPost(
        `/v1/admin/api-tokens/${apiToken.id}/revoke`,
        superCookies,
      );
      expect((again.body as { data: ApiTokenBody }).data.revokedAt).toBe(
        revokedAt,
      );
    });

    it('만료된 토큰은 401', async () => {
      const { token, apiToken } = await issue({
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
      await bearer('get', '/v1/token-probe/scoped', token).expect(200);

      await prisma.apiToken.update({
        where: { id: apiToken.id },
        data: { expiresAt: new Date(Date.now() - 1_000) },
      });
      const res = await bearer('get', '/v1/token-probe/scoped', token);
      expect(res.status).toBe(401);
    });

    it('주인이 정지되면 401', async () => {
      const suspended = await createUser('suspended');
      const { token } = await issue({ userId: suspended.id });
      await bearer('get', '/v1/token-probe/scoped', token).expect(200);

      await prisma.user.update({
        where: { id: suspended.id },
        data: { suspendedUntil: new Date(Date.now() + 60 * 60_000) },
      });
      const res = await bearer('get', '/v1/token-probe/scoped', token);
      expect(res.status).toBe(401);
    });

    it('원문 한 글자만 달라도 401', async () => {
      const { token } = await issue();
      const forged = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');
      const res = await bearer('get', '/v1/token-probe/scoped', forged);
      expect(res.status).toBe(401);
    });
  });

  describe('관리 경로 권한', () => {
    it('api-token:manage 가 없는 Admin 은 목록 · 발급 · 끊기 모두 403', async () => {
      const { apiToken } = await issue();
      const list = await request(app.getHttpServer())
        .get('/v1/admin/api-tokens')
        .set('Cookie', adminCookies);
      const created = await adminPost('/v1/admin/api-tokens', adminCookies, {
        userId: owner.id,
        name: 'n',
        scopes: [SCOPE],
      });
      const revoked = await adminPost(
        `/v1/admin/api-tokens/${apiToken.id}/revoke`,
        adminCookies,
      );
      expect([list.status, created.status, revoked.status]).toEqual([
        403, 403, 403,
      ]);
    });
  });
});
