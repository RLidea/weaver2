/**
 * 관리자 분석 API 의 응답 모양 — 화면(admin-dashboard.api.ts)은 본문의 data 를 곧장
 * UserAnalytics · ContentAnalytics 로 읽는다. 컨트롤러가 SuccessInterceptor 위에서 한 번 더 싸면
 * data 가 { success, data } 가 되어 대시보드가 retentionRate.daily 에서 깨진다.
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
import { getAuthCookies } from './helpers/auth.helper';
import { ensureSystemPermissionGroups } from './helpers/permission-group.helper';

const PASSWORD = 'TestPass1234!';

describe('Admin analytics — 응답 모양 (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookies = '';
  let userId = '';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    await ensureSystemPermissionGroups(prisma);
    const tag = `analytics_${Date.now()}`;
    const email = `${tag}@integration-test.local`;
    const admin = await prisma.permissionGroup.findUniqueOrThrow({
      where: { name: 'Admin' },
    });
    const user = await prisma.user.create({
      data: {
        email,
        username: tag,
        displayName: tag,
        emailVerifiedAt: new Date(),
        localCredential: {
          create: { passwordHash: await bcrypt.hash(PASSWORD, 4) },
        },
        permissionGroups: { create: { permissionGroupId: admin.id } },
      },
    });
    userId = user.id;
    cookies = await getAuthCookies(app, email, PASSWORD);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await closeTestApp();
  });

  function get(path: string) {
    return request(app.getHttpServer()).get(path).set('Cookie', cookies);
  }

  it('users — data 가 곧 UserAnalytics 다 (기간 없으면 30일)', async () => {
    const res = await get('/v1/admin/analytics/users').expect(200);
    expect(res.body.data.signupTrends).toHaveLength(30);
    expect(res.body.data.retentionRate).toEqual({
      daily: expect.any(Number),
      weekly: expect.any(Number),
      monthly: expect.any(Number),
    });
  });

  it('content — data 가 곧 ContentAnalytics 다', async () => {
    const res = await get('/v1/admin/analytics/content').expect(200);
    expect(Array.isArray(res.body.data.postTrends)).toBe(true);
    expect(Array.isArray(res.body.data.topBoards)).toBe(true);
  });

  it('summary — data 아래에 네 묶음이 바로 있다', async () => {
    const res = await get('/v1/admin/analytics/summary').expect(200);
    expect(Object.keys(res.body.data).sort()).toEqual([
      'content',
      'overview',
      'system',
      'users',
    ]);
    expect(res.body.data.users.retentionRate).toBeDefined();
  });
});
