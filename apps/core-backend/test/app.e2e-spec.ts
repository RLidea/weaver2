import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CoreModule } from '../src/core.module';

describe('CoreController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  // 앱을 닫지 않으면 Prisma 등 열린 핸들이 남아 Jest 가 종료되지 않는다.
  afterEach(async () => {
    await app.close();
  });

  // 부팅 스모크 테스트 — 앱이 뜨고 루트 라우트가 설정값을 읽어 응답하는지만 본다.
  // 서비스명을 문자열로 박지 않는다: 이 테스트는 예전에 'Hello Weaver2!' 를 기대하도록
  // 박혀 있다가, 응답 형식이 바뀐 뒤로도 아무도 모르게 죽어 있었다.
  it('/ (GET) — 앱이 떠서 루트 라우트가 응답한다', async () => {
    const response = await request(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      app.getHttpServer(),
    )
      .get('/')
      .expect(200);

    // 형식: `${APP_NAME}(${NODE_ENV}) is running`
    expect(response.text).toMatch(/^.+\(.+\) is running$/);
  });
});
