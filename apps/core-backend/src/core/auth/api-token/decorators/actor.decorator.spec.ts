import type { Request } from 'express';
import { getRequestActor } from './actor.decorator';

const req = (fields: object) => fields as unknown as Request;

describe('getRequestActor', () => {
  it('토큰 요청은 TOKEN · 주인', () => {
    expect(
      getRequestActor(
        req({
          user: { id: 'owner', isLogin: true },
          apiToken: { id: 't', scopes: [] },
        }),
      ),
    ).toEqual({ userId: 'owner', kind: 'TOKEN' });
  });

  it('로그인 세션은 SESSION · 사용자', () => {
    expect(getRequestActor(req({ user: { id: 'u', isLogin: true } }))).toEqual({
      userId: 'u',
      kind: 'SESSION',
    });
  });

  it.each([
    ['req.user 없음', {}],
    ['공개 경로의 비로그인', { user: { isLogin: false } }],
  ])('%s 은 userId null · SESSION', (_, fields) => {
    expect(getRequestActor(req(fields))).toEqual({
      userId: null,
      kind: 'SESSION',
    });
  });
});
