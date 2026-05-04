/**
 * Auth Security Integration Tests
 *
 * 실제 DB와 NestJS 앱을 사용하는 통합 테스트.
 * 단위 테스트로 검증 불가능한 "요청이 실제로 차단되는가"를 검증한다.
 *
 * 검증 대상:
 * 1. 계정 잠금 — 5회 실패 후 올바른 비밀번호로도 차단
 * 2. 권한 가드 — 권한 없는 유저는 보호된 엔드포인트 403
 * 3. 정지 계정 — suspendedUntil이 미래인 계정은 로그인 차단
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@weaver2/prisma';
import { createTestApp, closeTestApp, getTestingModule } from './helpers/test-app.helper';
import { loginAs, getCsrfToken, getAuthCookies } from './helpers/auth.helper';

const TEST_PASSWORD = 'TestPass1234!';
const WRONG_PASSWORD = 'WrongPass0000!';

// 테스트 실행마다 고유한 이메일 생성 (충돌 방지)
function uniqueEmail(prefix: string) {
  return `${prefix}_${Date.now()}@integration-test.local`;
}

describe('Auth Security (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestingModule().get(PrismaService);
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
      const cookies = (res.headers['set-cookie'] as unknown) as string[];
      expect(cookies.some((c: string) => c.startsWith('access_token'))).toBe(true);
    });

    it('존재하지 않는 이메일로 로그인 시 401', async () => {
      const res = await loginAs(app, 'nobody@nowhere.local', WRONG_PASSWORD);
      expect(res.status).toBe(401);
    });
  });
});
