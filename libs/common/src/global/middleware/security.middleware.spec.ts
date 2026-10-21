import {
  Controller,
  Get,
  INestApplication,
  Post,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { setSecurityMiddleware } from './security.middleware';

@Controller({ version: '1' })
class ProbeController {
  @Post('auth/oauth/apple/callback')
  appleCallback() {
    return 'callback';
  }

  @Post('auth/oidc/backchannel-logout')
  backchannelLogout() {
    return 'backchannel';
  }

  @Post('auth/oidc/backchannel-logout-x')
  backchannelLookalike() {
    return 'lookalike';
  }

  @Get('auth/oidc/backchannel-logout')
  backchannelRead() {
    return 'read';
  }

  @Post('other')
  other() {
    return 'other';
  }

  @Get('other')
  read() {
    return 'read';
  }
}

describe('setSecurityMiddleware', () => {
  const APP_ORIGIN = 'http://localhost:3000';
  // Swagger 가 떠 있는 백엔드 자신의 origin (.env.example 의 ORIGIN_URL=localhost:4000)
  const SWAGGER_ORIGIN = 'http://localhost:4000';
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ALLOWED_ORIGINS = `${APP_ORIGIN},${SWAGGER_ORIGIN}`;
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
    app.use(cookieParser());
    setSecurityMiddleware(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Apple form_post 콜백은 CSRF 토큰 없이도, 남의 Origin 에서도 통과한다', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/oauth/apple/callback')
      .set('Origin', 'https://appleid.apple.com')
      .type('form')
      .send({ code: 'c', state: 's' });

    expect(res.status).toBe(201);
    expect(res.text).toBe('callback');
    // 내비게이션이라 CORS 헤더를 주지 않는다
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('다른 경로는 같은 Origin 이라도 CORS 로 막힌다', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/other')
      .set('Origin', 'https://appleid.apple.com');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.text).not.toBe('other');
  });

  it('허용된 Origin 이라도 CSRF 토큰 없는 POST 는 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/other')
      .set('Origin', APP_ORIGIN);

    expect(res.status).toBe(403);
  });

  it('허용된 Origin 에는 지금처럼 CORS 헤더(자격 증명 포함)를 준다', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/other')
      .set('Origin', APP_ORIGIN);

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(APP_ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('비슷한 경로(접두어 일치)는 면제되지 않는다', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/oauth/apple/callback-x')
      .set('Origin', APP_ORIGIN);

    expect(res.status).toBe(403);
  });

  describe('Swagger CSRF 면제 — 백엔드 자신의 origin 에서 온 것만', () => {
    const originalOriginUrl = process.env.ORIGIN_URL;
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    beforeEach(() => {
      process.env.ORIGIN_URL = 'localhost:4000';
    });

    afterAll(() => {
      if (originalOriginUrl === undefined) delete process.env.ORIGIN_URL;
      else process.env.ORIGIN_URL = originalOriginUrl;
    });

    it('Swagger origin 과 정확히 같은 Origin 은 면제된다', async () => {
      const res = await request(server())
        .post('/v1/other')
        .set('Origin', SWAGGER_ORIGIN);

      expect(res.status).toBe(201);
    });

    it('같은 origin 의 /docs Referer 는 면제된다', async () => {
      for (const referer of [
        `${SWAGGER_ORIGIN}/docs`,
        `${SWAGGER_ORIGIN}/docs/`,
        `${SWAGGER_ORIGIN}/docs/#/auth`,
      ]) {
        const res = await request(server())
          .post('/v1/other')
          .set('Referer', referer);

        expect(res.status).toBe(201);
      }
    });

    it('ORIGIN_URL 에 스킴까지 적어도 origin 전체로 정확 비교한다', async () => {
      process.env.ORIGIN_URL = SWAGGER_ORIGIN;
      const ok = await request(server())
        .post('/v1/other')
        .set('Referer', `${SWAGGER_ORIGIN}/docs`);
      const otherScheme = await request(server())
        .post('/v1/other')
        .set('Referer', 'https://localhost:4000/docs');

      expect(ok.status).toBe(201);
      expect(otherScheme.status).toBe(403);
    });

    it('남의 사이트의 /docs Referer 는 면제되지 않는다', async () => {
      for (const referer of [
        'https://evil.com/docs',
        'http://localhost:4000.evil.com/docs',
        'https://evil.com/?r=http://localhost:4000/docs',
      ]) {
        const res = await request(server())
          .post('/v1/other')
          .set('Referer', referer);

        expect(res.status).toBe(403);
      }
    });

    it('같은 origin 이라도 /docs 밖의 Referer 는 면제되지 않는다', async () => {
      for (const referer of [
        `${SWAGGER_ORIGIN}/docsx`,
        `${SWAGGER_ORIGIN}/admin?from=/docs`,
      ]) {
        const res = await request(server())
          .post('/v1/other')
          .set('Referer', referer);

        expect(res.status).toBe(403);
      }
    });

    it('ORIGIN_URL 이 없으면 아무것도 면제하지 않는다', async () => {
      delete process.env.ORIGIN_URL;
      const byOrigin = await request(server())
        .post('/v1/other')
        .set('Origin', SWAGGER_ORIGIN);
      const byReferer = await request(server())
        .post('/v1/other')
        .set('Referer', `${SWAGGER_ORIGIN}/docs`);

      expect(byOrigin.status).toBe(403);
      expect(byReferer.status).toBe(403);
    });

    it('URL 로 읽을 수 없는 Referer 는 던지지 않고 그냥 면제하지 않는다', async () => {
      const res = await request(server())
        .post('/v1/other')
        .set('Referer', '::not a url /docs');

      expect(res.status).toBe(403);
    });
  });

  describe('Bearer 면제 — 쿠키 없이 Authorization 만 싣고 온 요청', () => {
    const server = () => app.getHttpServer() as Parameters<typeof request>[0];

    it('Bearer 만 실렸으면 CSRF 토큰 없이도 통과한다 (범위 토큰 · 앱)', async () => {
      const res = await request(server())
        .post('/v1/other')
        .set('Authorization', 'Bearer wvt_0123456789ab_' + 'a'.repeat(64));

      expect(res.status).toBe(201);
      expect(res.text).toBe('other');
    });

    it('인증 쿠키(access_token)가 함께 오면 면제하지 않는다', async () => {
      const res = await request(server())
        .post('/v1/other')
        .set('Authorization', 'Bearer abc')
        .set('Cookie', 'access_token=jwt');

      expect(res.status).toBe(403);
    });

    it('Bearer 가 아닌 Authorization 은 면제하지 않는다', async () => {
      const res = await request(server())
        .post('/v1/other')
        .set('Authorization', 'Basic abc');

      expect(res.status).toBe(403);
    });
  });
  describe('서버 간 면제 — OIDC back-channel 로그아웃', () => {
    const server = () => app.getHttpServer();

    it('쿠키 · Origin · CSRF 토큰 없이 form POST 가 통과한다 (발급자가 서버에서 보낸다)', async () => {
      const res = await request(server())
        .post('/v1/auth/oidc/backchannel-logout')
        .set('User-Agent', 'RLidea-Accounts/1 test')
        .type('form')
        .send({ logout_token: 'x.y.z' });

      expect(res.status).toBe(201);
      expect(res.text).toBe('backchannel');
    });

    it('경로가 글자까지 같아야 한다 — 접두어 · 끝 빗금은 면제되지 않는다', async () => {
      for (const path of [
        '/v1/auth/oidc/backchannel-logout-x',
        '/v1/auth/oidc/backchannel-logout/',
      ]) {
        const res = await request(server()).post(path).type('form').send({});
        expect(res.status).toBe(403);
      }
    });

    it('면제는 그 경로에만 — 다른 POST 는 여전히 CSRF 403', async () => {
      const res = await request(server())
        .post('/v1/other')
        .type('form')
        .send({ logout_token: 'x.y.z' });

      expect(res.status).toBe(403);
    });
  });
});
