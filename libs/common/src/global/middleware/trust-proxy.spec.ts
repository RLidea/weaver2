/**
 * trust proxy 회귀 시험 — 프록시 뒤에서 req.ip 가 진짜 클라이언트 IP 인지 못박는다.
 *
 * 배경: trust proxy 가 없으면 Next.js rewrite·nginx 뒤에서 req.ip 가 늘 127.0.0.1 이라
 * 스로틀 버킷이 사이트 전체에 하나로 뭉친다(한 사람이 로그인 한도를 다 쓰면 모두가 막힌다).
 * DB 는 안 탄다 — 최소 앱에 setTrustProxy 와 실제 ThrottlerGuard 를 태워 잰다.
 */
import { Controller, Get, INestApplication, Req } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Request } from 'express';
import request from 'supertest';
import { parseTrustProxy, setTrustProxy } from './trust-proxy';

@Controller('ip-probe')
class IpProbeController {
  @Get()
  ip(@Req() req: Request): string {
    return req.ip ?? '';
  }

  @Get('throttled')
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  throttled(): string {
    return 'ok';
  }
}

async function buildApp(trustProxy: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  const original = env.TRUST_PROXY;
  if (trustProxy === undefined) delete env.TRUST_PROXY;
  else env.TRUST_PROXY = trustProxy;
  try {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 100 }] }),
      ],
      controllers: [IpProbeController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();
    const app: INestApplication = moduleRef.createNestApplication({
      logger: false,
    });
    setTrustProxy(app);
    await app.init();
    return app;
  } finally {
    env.TRUST_PROXY = original;
    if (original === undefined) delete env.TRUST_PROXY;
  }
}

const serverOf = (app: INestApplication) =>
  app.getHttpServer() as Parameters<typeof request>[0];

const isLoopback = (ip: string) =>
  ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

describe('parseTrustProxy', () => {
  it('미설정·빈 값은 loopback 만 믿는다', () => {
    expect(parseTrustProxy(undefined)).toEqual(['loopback']);
    expect(parseTrustProxy('  ')).toEqual(['loopback']);
  });

  it('true/false·홉 수·쉼표 목록을 express 가 받는 꼴로 바꾼다', () => {
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('2')).toBe(2);
    expect(parseTrustProxy('loopback, 10.0.0.0/8 ,uniquelocal')).toEqual([
      'loopback',
      '10.0.0.0/8',
      'uniquelocal',
    ]);
  });
});

describe('setTrustProxy', () => {
  it('기본(loopback)이면 같은 호스트 프록시가 준 X-Forwarded-For 를 req.ip 로 쓴다', async () => {
    const app = await buildApp(undefined);
    try {
      const res = await request(serverOf(app))
        .get('/ip-probe')
        .set('X-Forwarded-For', '203.0.113.7');

      expect(res.text).toBe('203.0.113.7');
    } finally {
      await app.close();
    }
  });

  it('false 면 X-Forwarded-For 를 무시하고 소켓 주소(loopback)를 쓴다', async () => {
    const app = await buildApp('false');
    try {
      const res = await request(serverOf(app))
        .get('/ip-probe')
        .set('X-Forwarded-For', '203.0.113.7');

      expect(isLoopback(res.text)).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('loopback 이면 믿지 않는 홉 앞에 끼워 넣은 위조 IP 는 건너뛴다', async () => {
    const app = await buildApp('loopback');
    try {
      // 클라이언트가 198.51.100.1 을 끼워 넣고, 앞단 프록시가 진짜 주소를 덧붙인 꼴
      const res = await request(serverOf(app))
        .get('/ip-probe')
        .set('X-Forwarded-For', '198.51.100.1, 203.0.113.7');

      expect(res.text).toBe('203.0.113.7');
    } finally {
      await app.close();
    }
  });

  it('클라이언트 IP 가 다르면 스로틀 버킷도 따로 잡힌다', async () => {
    const app = await buildApp(undefined);
    try {
      const hit = (ip: string) =>
        request(serverOf(app))
          .get('/ip-probe/throttled')
          .set('X-Forwarded-For', ip);

      expect((await hit('203.0.113.7')).status).toBe(200);
      expect((await hit('203.0.113.7')).status).toBe(429);
      // 예전(trust proxy 없음)엔 둘 다 127.0.0.1 이라 여기서도 429 였다
      expect((await hit('203.0.113.8')).status).toBe(200);
    } finally {
      await app.close();
    }
  });
});
