/**
 * StaticController 경로 순회 회귀 시험.
 *
 * 2026-09-15, 이 컨트롤러(@Public, 인증 없음)가 인증 없는 임의 파일 읽기에
 * 노출돼 있었다. `:type`·`:file`·`:component` 를 그대로 join 에 넣고 root 옵션
 * 없이 sendFile 하던 탓에, `..%2f` 순회로 저장소 루트 package.json 이 읽혔다
 * (라이브 실측: GET /static/shared/styles/..%2f×6/package.json → 200).
 *
 * 이 시험은 **실제 순회 페이로드를 HTTP 로 쏘아** 막혔는지 못박는다. 문자열
 * 검사가 아니라 supertest 로 라우팅·디코드·sendFile 전체를 태운다 — 고침이
 * blocklist 가 아니라 경계 검사(resolve 후 base 안인지)라, 그 경로를 실제로
 * 통과시켜 봐야 의미가 있다.
 *
 * DB 는 타지 않는다. StaticController 만 담은 최소 모듈을 실제 express 어댑터로
 * 띄운다 — 취약점은 경로 처리에 있지 가드에 있지 않으므로 이걸로 충분하고,
 * test:core(단위, DB 없음)에서 매번 돌 수 있다.
 *
 * ⚠ supertest(superagent)는 `..%2f` 를 정규화하지 않고 서버까지 그대로 보낸다.
 *   그래서 이 시험이 성립한다. 정규화하는 클라이언트로 쏘면 서버에 닿기 전에
 *   경로가 접혀서, 「통과하는데 아무것도 안 막는」 시험이 된다.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { StaticController } from './static.controller';

describe('StaticController 경로 순회 방어 (통합)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StaticController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer() as Parameters<typeof request>[0];

  // 라이브에서 실제로 루트 package.json 을 흘렸던 페이로드들. base 중첩 깊이에
  // 맞춰 `../` 개수가 다르다 — 넉넉히 겹쳐 어느 깊이든 밖으로 나가게 한다.
  const TRAVERSALS = [
    '/static/shared/styles/..%2f..%2f..%2f..%2f..%2f..%2fpackage.json',
    '/static/shared/components/tabs/..%2f..%2f..%2f..%2f..%2f..%2f..%2fpackage.json',
    '/static/admin/css/..%2f..%2f..%2f..%2f..%2f..%2fpackage.json',
    // /etc/passwd 방향 (base 밖 절대 위치). 무해한 존재 여부만 본다 — 내용은 안 읽는다.
    '/static/shared/styles/..%2f..%2f..%2f..%2f..%2f..%2f..%2f..%2f..%2f..%2f..%2f..%2f..%2fetc%2fpasswd',
  ];

  it.each(TRAVERSALS)('순회를 막는다: %s', async (path) => {
    const res = await request(server()).get(path);
    // base 밖은 파일이 있든 없든 404 — 존재 여부를 흘리지 않는다.
    expect(res.status).toBe(404);
    // 내용이 새지 않았음을 못박는다 (루트 package.json 표식).
    expect(res.text ?? '').not.toContain('"name": "weaver2"');
    expect(res.text ?? '').not.toContain('root:x:0:0');
  });

  // 회귀 방지: 정상 자원은 여전히 서빙돼야 한다 (고침이 정상 경로를 막으면 안 된다).
  it('정상 자원은 그대로 서빙한다', async () => {
    const res = await request(server()).get(
      '/static/shared/styles/components.css',
    );
    expect(res.status).toBe(200);
  });
});
