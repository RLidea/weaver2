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
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ALLOWED_ORIGINS = APP_ORIGIN;
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
});
