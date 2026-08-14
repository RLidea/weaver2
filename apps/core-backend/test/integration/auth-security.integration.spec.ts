/**
 * Auth Security Integration Tests
 *
 * 실제 DB와 NestJS 앱을 사용하는 통합 테스트.
 * 단위 테스트로 검증 불가능한 "요청이 실제로 차단되는가"를 검증한다.
 *
 * 검증 대상:
 * 1. 계정 잠금 — 5회 실패 후 올바른 비밀번호로도 차단
 * 2. 권한 가드 — 권한 없는 유저는 보호된 엔드포인트 403
 * 3. 정지 계정 — 로그인 차단 + **이미 로그인된 세션도 즉시 차단**
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
import { loginAs, getAuthCookies } from './helpers/auth.helper';
import { UserAdminService } from '../../src/core/user/services/user-admin.service';

const TEST_PASSWORD = 'TestPass1234!';
const WRONG_PASSWORD = 'WrongPass0000!';

// 테스트 실행마다 고유한 이메일 생성 (충돌 방지)
function uniqueEmail(prefix: string) {
  return `${prefix}_${Date.now()}@integration-test.local`;
}

describe('Auth Security (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userAdminService: UserAdminService;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestingModule().get(PrismaService);
    userAdminService = getTestingModule().get(UserAdminService);
  });

  afterAll(async () => {
    // 테스트 유저 일괄 삭제
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await closeTestApp();
  });

  /** 테스트용 인증 유저 직접 생성 (이메일 인증 완료 상태) */
  async function createVerifiedUser(email: string) {
    const hashedPw = await bcrypt.hash(TEST_PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        email,
        username: email.split('@')[0],
        displayName: email.split('@')[0],
        localCredential: {
          create: {
            password: hashedPw,
            isVerified: true,
          },
        },
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  // ────────────────────────────────────────────────────────────
  // 1. 계정 잠금
  // ────────────────────────────────────────────────────────────
  describe('계정 잠금', () => {
    it('5회 로그인 실패 후 올바른 비밀번호로 시도해도 잠금 메시지 반환', async () => {
      const email = uniqueEmail('lockout');
      await createVerifiedUser(email);

      // 5회 실패
      for (let i = 0; i < 5; i++) {
        await loginAs(app, email, WRONG_PASSWORD);
      }

      // 6번째 — 올바른 비밀번호지만 잠겨야 함
      const res = await loginAs(app, email, TEST_PASSWORD);

      expect(res.status).toBe(401);
      expect(JSON.stringify(res.body)).toContain('temporarily locked');
    });

    it('5회 미만 실패는 잠금 없이 Invalid credentials 반환', async () => {
      const email = uniqueEmail('no-lockout');
      await createVerifiedUser(email);

      for (let i = 0; i < 4; i++) {
        const res = await loginAs(app, email, WRONG_PASSWORD);
        expect(res.status).toBe(401);
        expect(JSON.stringify(res.body)).toContain('Invalid credentials');
      }
    });
  });

  // ────────────────────────────────────────────────────────────
  // 2. 권한 가드
  // ────────────────────────────────────────────────────────────
  describe('권한 가드', () => {
    it('권한 없는 유저가 email:template:manage 엔드포인트 접근 시 403', async () => {
      const email = uniqueEmail('noperm');
      await createVerifiedUser(email);
      const cookies = await getAuthCookies(app, email, TEST_PASSWORD);

      const res = await request(app.getHttpServer())
        .get('/v1/email/templates')
        .set('Cookie', cookies);

      expect(res.status).toBe(403);
    });

    it('비로그인 상태에서 보호된 엔드포인트 접근 시 401', async () => {
      const res = await request(app.getHttpServer()).get('/v1/email/templates');
      expect(res.status).toBe(401);
    });
  });

  // ────────────────────────────────────────────────────────────
  // 3. 정지 계정
  // ────────────────────────────────────────────────────────────
  describe('정지 계정', () => {
    it('suspendedUntil이 미래인 계정은 로그인 시 401 차단', async () => {
      const email = uniqueEmail('suspended');
      const user = await createVerifiedUser(email);

      // 계정 정지 처리
      await prisma.user.update({
        where: { id: user.id },
        data: {
          suspendedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 후
        },
      });

      const res = await loginAs(app, email, TEST_PASSWORD);

      expect(res.status).toBe(401);
      expect(JSON.stringify(res.body)).toContain('suspended until');
    });

    /**
     * **정지는 「지금부터 못 쓴다」는 뜻이어야 한다.**
     *
     * 새 로그인만 막으면 **이미 브라우저에 들어 있는 access token** 이 만료(기본 1시간)
     * 까지 그대로 통한다 — 정지당한 사람이 열어둔 탭으로 계속 일한다. 그래서
     * `jwt.strategy.validate()` 가 정지를 본다.
     *
     * 이 테스트는 **정지 전에 받은 쿠키를 그대로 들고** 요청해 그 즉시성을 증명한다.
     * 로그인을 다시 시도하면 (이미 막히는) 로그인 경로만 확인하게 되어 아무것도
     * 증명하지 못한다.
     */
    it('정지되면 이미 로그인된 세션도 즉시 401 — access token 이 남아 있어도', async () => {
      const email = uniqueEmail('suspended-live');
      const user = await createVerifiedUser(email);
      const cookies = await getAuthCookies(app, email, TEST_PASSWORD);

      // 정지 전에는 통과한다. 이 줄이 없으면 아래 401 이 "정지 때문" 인지
      // "원래부터 안 되던 것" 인지 구별되지 않는다.
      await request(app.getHttpServer())
        .get('/v1/auth/sessions')
        .set('Cookie', cookies)
        .expect(200);

      await prisma.user.update({
        where: { id: user.id },
        data: { suspendedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });

      await request(app.getHttpServer())
        .get('/v1/auth/sessions')
        .set('Cookie', cookies)
        .expect(401);
    });

    /** 정지는 세션도 함께 끊는다 — 갱신으로 되살아나는 길을 막는다. */
    it('정지되면 기존 refresh 토큰이 남지 않는다', async () => {
      const email = uniqueEmail('suspended-sessions');
      const user = await createVerifiedUser(email);
      await getAuthCookies(app, email, TEST_PASSWORD);

      expect(
        await prisma.refreshToken.count({ where: { userId: user.id } }),
      ).toBeGreaterThan(0);

      await userAdminService.suspendUser('admin-actor', user.id, { days: 1 });

      expect(
        await prisma.refreshToken.count({ where: { userId: user.id } }),
      ).toBe(0);
    });

    it('suspendedUntil이 과거이면 정상 로그인', async () => {
      const email = uniqueEmail('unsuspended');
      const user = await createVerifiedUser(email);

      // 이미 만료된 정지
      await prisma.user.update({
        where: { id: user.id },
        data: {
          suspendedUntil: new Date(Date.now() - 1000),
        },
      });

      const res = await loginAs(app, email, TEST_PASSWORD);

      expect(res.status).toBe(201);
    });
  });

  // ────────────────────────────────────────────────────────────
  // 기본 동작
  // ────────────────────────────────────────────────────────────
  describe('기본 로그인', () => {
    it('올바른 자격증명으로 로그인 시 200 + access_token 쿠키 발급', async () => {
      const email = uniqueEmail('success');
      await createVerifiedUser(email);

      const res = await loginAs(app, email, TEST_PASSWORD);

      expect(res.status).toBe(201);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c: string) => c.startsWith('access_token'))).toBe(
        true,
      );
    });

    it('존재하지 않는 이메일로 로그인 시 401', async () => {
      const res = await loginAs(app, 'nobody@nowhere.local', WRONG_PASSWORD);
      expect(res.status).toBe(401);
    });
  });
});
