/**
 * DevThrottlerGuard 회귀 시험 — 무차별 대입 방어가 실제로 도는지 못박는다.
 *
 * 배경: 로그인·회원가입·비밀번호 재설정·2FA 등 인증 엔드포인트가 @Throttle 로
 * 요청 수를 제한하지만, 이 방어가 실제로 429 를 내는지 검증하는 시험이 없었다.
 *
 * 🔴 게다가 통합시험은 이 방어를 **끈 채** 돈다:
 *   apps/core-backend/test/integration/setup.ts 가 NODE_ENV='development' 로
 *   강제하고, DevThrottlerGuard 는 development 면 통과시킨다(canActivate → true).
 *   그래서 기존 통합시험 어디에서도 스로틀이 켜진 상태를 밟지 않는다. 누가
 *   DevThrottlerGuard 의 스킵 조건을 「항상 스킵」으로 바꿔도 잡히지 않았다.
 *
 * 이 시험은 그 구멍을 메운다. DB 는 안 탄다 — 실제 DevThrottlerGuard 와 실제
 * ThrottlerModule 을 최소 앱에 태우고, @Throttle 이 걸린 합성 엔드포인트로 잰다.
 * 검증 대상은 「우리 로그인이 429 를 내는가」가 아니라 그 아래층 —
 * 「DevThrottlerGuard + @Throttle 이 실제로 막는가, 그리고 dev 스킵이 정확한가」다.
 */
import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule, Throttle } from '@nestjs/throttler';
import request from 'supertest';
import { DevThrottlerGuard } from './dev-throttler.guard';

// 실제 인증 컨트롤러(@Throttle({ default: { limit, ttl } }))와 같은 모양의
// 합성 엔드포인트. limit 을 2 로 낮춰 빠르게 넘긴다.
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
      ThrottlerModule.forRoot({
        throttlers: [{ ttl: 60000, limit: 100 }],
      }),
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
  const originalEnv = env.NODE_ENV;

  afterEach(() => {
    env.NODE_ENV = originalEnv;
  });

  it('한도를 넘으면 429 로 막는다 (development 아님)', async () => {
    env.NODE_ENV = 'test';
    const app = await buildApp();
    try {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      // limit 2 → 1·2 통과, 3번째부터 429.
      expect((await request(server).get('/throttle-probe')).status).toBe(200);
      expect((await request(server).get('/throttle-probe')).status).toBe(200);
      expect((await request(server).get('/throttle-probe')).status).toBe(429);
    } finally {
      await app.close();
    }
  });

  it('development 에서는 스로틀을 건너뛴다 (개발 편의)', async () => {
    env.NODE_ENV = 'development';
    const app = await buildApp();
    try {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      // limit 2 여도 development 면 한도를 넘겨도 전부 통과.
      for (let i = 0; i < 5; i++) {
        expect((await request(server).get('/throttle-probe')).status).toBe(200);
      }
    } finally {
      await app.close();
    }
  });
});
