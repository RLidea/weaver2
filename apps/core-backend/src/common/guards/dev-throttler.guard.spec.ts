/**
 * DevThrottlerGuard 회귀 시험 — 무차별 대입 방어가 실제로 도는지 못박는다.
 *
 * 배경: 로그인·회원가입·비밀번호 재설정·2FA 가 @Throttle 로 요청 수를 제한하지만,
 * 그게 실제로 429 를 내는지 검증하는 시험이 없었다.
 *
 * 🔴 그리고 스킵 조건이 예전엔 NODE_ENV==='development' 였다. .env.example 이
 * NODE_ENV=development 를 배포 틀로 내보내고 PM2 배포가 NODE_ENV 를 안 세워서,
 * 프로덕션 스로틀이 조용히 꺼졌다. 이제 스킵은 THROTTLE_DISABLED=true 하나로만 한다.
 *
 * 이 시험은 그 새 계약을 못박는다 — 특히 「development 여도 플래그 없으면 막는다」가
 * footgun 이 닫혔다는 증거다. DB 는 안 탄다(실제 가드 + 실제 ThrottlerModule 을
 * 최소 앱에 태우고 @Throttle 합성 엔드포인트로 잰다).
 */
import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule, Throttle } from '@nestjs/throttler';
import request from 'supertest';
import { DevThrottlerGuard } from './dev-throttler.guard';

@Controller('throttle-probe')
class ThrottleProbeController {
  @Get()
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  hit(): string {
    return 'ok';
  }
}

async function buildApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 100 }] }),
    ],
    controllers: [ThrottleProbeController],
    providers: [{ provide: APP_GUARD, useClass: DevThrottlerGuard }],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('DevThrottlerGuard (무차별 대입 방어)', () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  const originalFlag = env.THROTTLE_DISABLED;

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
    env.THROTTLE_DISABLED = originalFlag;
  });

  it('플래그가 없으면 한도를 넘을 때 429 로 막는다', async () => {
    env.NODE_ENV = 'test';
    delete env.THROTTLE_DISABLED;
    const app = await buildApp();
    try {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      expect((await request(server).get('/throttle-probe')).status).toBe(200);
      expect((await request(server).get('/throttle-probe')).status).toBe(200);
      expect((await request(server).get('/throttle-probe')).status).toBe(429);
    } finally {
      await app.close();
    }
  });

  it('🔴 NODE_ENV=development 여도 플래그가 없으면 막는다 (footgun 이 닫혔다)', async () => {
    // 예전 계약이라면 여기서 스킵돼 429 가 안 났다 — 그게 프로덕션 스로틀이 꺼지던 자리다.
    env.NODE_ENV = 'development';
    delete env.THROTTLE_DISABLED;
    const app = await buildApp();
    try {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      expect((await request(server).get('/throttle-probe')).status).toBe(200);
      expect((await request(server).get('/throttle-probe')).status).toBe(200);
      expect((await request(server).get('/throttle-probe')).status).toBe(429);
    } finally {
      await app.close();
    }
  });

  it('THROTTLE_DISABLED=true 면 명시적으로 끈다 (개발·테스트 편의)', async () => {
    env.NODE_ENV = 'production';
    env.THROTTLE_DISABLED = 'true';
    const app = await buildApp();
    try {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      // 한도 2 여도 플래그가 있으면 넘겨도 전부 통과.
      for (let i = 0; i < 5; i++) {
        expect((await request(server).get('/throttle-probe')).status).toBe(200);
      }
    } finally {
      await app.close();
    }
  });
});
