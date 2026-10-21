/**
 * 인증 가드 회귀 시험 — 공개 라우트의 선택적 인증이 보호 라우트와 **같은 검증**을 받는지 못박는다.
 *
 * 배경 (설계 2026-10-17 auth-credential-model R4): 공개 라우트 분기가 `jwtService.verify` 로
 * 서명만 봐서, 비밀번호만 아는 사람이 2FA 전에 받은 pre-auth 토큰을 `access_token` 쿠키에
 * 넣으면 공개 라우트(회원 게시판·비밀글)를 그 사람으로 읽었다. 탈퇴·정지된 사용자의 남은
 * 토큰도 같았다.
 *
 * DB 는 안 탄다 — 최소 앱에 실제 JwtModule 옵션·JwtStrategy·JwtAuthGuard 를 태우고 사용자
 * 조회만 바꿔 끼운다.
 */
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}));
jest.mock('qrcode', () => ({ toDataURL: jest.fn() }));

import { Controller, Get, INestApplication, Req } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@weaver2/prisma';
import { Public } from '@weaver2/common/decorator/public.decorator';
import cookieParser from 'cookie-parser';
import type { Request } from 'express';
import request from 'supertest';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from '../strategy/jwt.strategy';
import { jwtModuleOptions } from '../strategy/jwt-module-options';
import { TwoFactorService } from '../services/two-factor.service';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { OneTimeCodeService } from '../one-time-code/one-time-code.service';
import { ApiTokenService } from '../api-token/api-token.service';
import { generateApiToken } from '../api-token/api-token.crypto';
import { ApiTokenScope } from '../api-token/decorators/api-token-scope.decorator';
import { Actor, RequestActor } from '../api-token/decorators/actor.decorator';

const SECRET = 'guard-spec-secret';
const USER_ID = 'user-1';

@Controller('probe')
class ProbeController {
  @Public()
  @Get('public')
  open(@Req() req: Request) {
    return req.user;
  }

  @Get('private')
  closed(@Req() req: Request) {
    return req.user;
  }

  @ApiTokenScope('probe:write')
  @Get('scoped')
  scoped(@Actor() actor: RequestActor) {
    return actor;
  }
}

describe('JwtAuthGuard', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let preAuth: TwoFactorService;
  const findFirst = jest.fn();
  const apiTokens = { verify: jest.fn(), markUsed: jest.fn() };

  beforeAll(async () => {
    const config = new ConfigService({ JWT_SECRET: SECRET });
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register(jwtModuleOptions(config))],
      controllers: [ProbeController],
      providers: [
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: { user: { findFirst } } },
        { provide: ApiTokenService, useValue: apiTokens },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.use(cookieParser());
    await app.init();
    jwt = app.get(JwtService);
    // pre-auth 토큰은 실제 발급 경로로 만든다 — 발급 쪽이 aud 를 빠뜨려도 잡히게
    preAuth = new TwoFactorService(
      {} as PrismaService,
      jwt,
      {} as EmailBusinessService,
      {} as OneTimeCodeService,
    );
  });

  afterAll(() => app.close());

  beforeEach(() => {
    apiTokens.verify.mockReset();
    apiTokens.markUsed.mockReset();
    findFirst.mockReset();
    findFirst.mockResolvedValue({
      id: USER_ID,
      username: 'alice',
      suspendedUntil: null,
      userSetting: null,
    });
  });

  const server = () => app.getHttpServer() as Parameters<typeof request>[0];
  const withCookie = (path: string, token: string) =>
    request(server()).get(path).set('Cookie', `access_token=${token}`);

  describe('공개 라우트', () => {
    it('토큰이 없으면 비로그인', async () => {
      const res = await request(server()).get('/probe/public');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ isLogin: false });
    });

    it('액세스 토큰이면 그 사용자로 로그인', async () => {
      const res = await withCookie('/probe/public', jwt.sign({ sub: USER_ID }));
      expect(res.body).toMatchObject({ id: USER_ID, isLogin: true });
    });

    it('🔴 pre-auth 토큰을 access_token 쿠키에 넣어도 비로그인 (2FA 우회 차단)', async () => {
      const token = preAuth.createPreAuthToken(USER_ID, false, null);
      const res = await withCookie('/probe/public', token);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ isLogin: false });
    });

    it('종류(aud)가 없는 옛 토큰도 비로그인', async () => {
      // 같은 비밀, 기본 옵션 없음 — aud 를 넣기 전에 발급된 토큰의 꼴
      const legacy = new JwtService({ secret: SECRET }).sign({ sub: USER_ID });
      const res = await withCookie('/probe/public', legacy);
      expect(res.body).toEqual({ isLogin: false });
    });

    it('탈퇴한 사용자의 남은 토큰은 비로그인', async () => {
      findFirst.mockResolvedValue(null);
      const res = await withCookie('/probe/public', jwt.sign({ sub: USER_ID }));
      expect(res.body).toEqual({ isLogin: false });
    });

    it('정지된 사용자의 남은 토큰은 비로그인', async () => {
      findFirst.mockResolvedValue({
        id: USER_ID,
        username: 'alice',
        suspendedUntil: new Date(Date.now() + 60_000),
        userSetting: null,
      });
      const res = await withCookie('/probe/public', jwt.sign({ sub: USER_ID }));
      expect(res.body).toEqual({ isLogin: false });
    });

    it('검증 도중 장애(DB)는 비로그인으로 숨기지 않는다', async () => {
      findFirst.mockRejectedValue(new Error('db down'));
      const res = await withCookie('/probe/public', jwt.sign({ sub: USER_ID }));
      expect(res.status).toBe(500);
    });
  });

  describe('보호 라우트', () => {
    it('액세스 토큰이면 통과', async () => {
      const res = await withCookie(
        '/probe/private',
        jwt.sign({ sub: USER_ID }),
      );
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: USER_ID, isLogin: true });
    });

    it('pre-auth 토큰이면 401', async () => {
      const token = preAuth.createPreAuthToken(USER_ID, false, null);
      const res = await withCookie('/probe/private', token);
      expect(res.status).toBe(401);
    });

    it('토큰이 없으면 401', async () => {
      const res = await request(server()).get('/probe/private');
      expect(res.status).toBe(401);
    });
  });

  describe('범위 토큰', () => {
    const issued = generateApiToken();
    const withToken = (path: string, raw = issued.raw) =>
      request(server()).get(path).set('Authorization', `Bearer ${raw}`);
    const alive = (scopes: string[]) => ({
      id: 'token-1',
      scopes,
      user: { id: USER_ID, username: 'bot' },
    });

    it('범위가 맞으면 통과 — 주체는 TOKEN, 주인 id, lastUsedAt 을 갱신한다', async () => {
      apiTokens.verify.mockResolvedValue(alive(['probe:write']));
      const res = await withToken('/probe/scoped');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ userId: USER_ID, kind: 'TOKEN' });
      expect(apiTokens.verify).toHaveBeenCalledWith({
        raw: issued.raw,
        prefix: issued.prefix,
      });
      expect(apiTokens.markUsed).toHaveBeenCalledWith('token-1');
    });

    it('범위가 다르면 403 — lastUsedAt 을 갱신하지 않는다', async () => {
      apiTokens.verify.mockResolvedValue(alive(['other:write']));
      const res = await withToken('/probe/scoped');
      expect(res.status).toBe(403);
      expect(apiTokens.markUsed).not.toHaveBeenCalled();
    });

    it('끊겼거나 만료된 토큰(verify 가 null)은 401', async () => {
      apiTokens.verify.mockResolvedValue(null);
      const res = await withToken('/probe/scoped');
      expect(res.status).toBe(401);
      expect(apiTokens.markUsed).not.toHaveBeenCalled();
    });

    it.each(['/probe/private', '/probe/public'])(
      '범위가 없는 경로(%s)에서는 401 — DB 를 읽지 않는다',
      async (path) => {
        apiTokens.verify.mockResolvedValue(alive(['probe:write']));
        const res = await withToken(path);
        expect(res.status).toBe(401);
        expect(apiTokens.verify).not.toHaveBeenCalled();
        expect(findFirst).not.toHaveBeenCalled();
      },
    );

    it('쿠키 세션이 함께 와도 토큰 갈래로 판정한다 — 세션으로 넘어가지 않는다', async () => {
      const res = await withToken('/probe/private').set(
        'Cookie',
        `access_token=${jwt.sign({ sub: USER_ID })}`,
      );
      expect(res.status).toBe(401);
    });

    it('세션은 범위 경로도 지금처럼 통과한다 — 주체는 SESSION', async () => {
      const res = await withCookie('/probe/scoped', jwt.sign({ sub: USER_ID }));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ userId: USER_ID, kind: 'SESSION' });
      expect(apiTokens.verify).not.toHaveBeenCalled();
    });

    it('Bearer 에 실린 액세스 JWT 는 토큰 갈래로 가지 않는다', async () => {
      const res = await request(server())
        .get('/probe/private')
        .set('Authorization', `Bearer ${jwt.sign({ sub: USER_ID })}`);
      expect(res.status).toBe(200);
      expect(apiTokens.verify).not.toHaveBeenCalled();
    });
  });
});
