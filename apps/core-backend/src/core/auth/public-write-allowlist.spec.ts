import {
  PUBLIC_WRITE_ALLOWLIST,
  isAllowlisted,
} from './public-write-allowlist';

describe('isAllowlisted', () => {
  const list = ['POST /v1/posts', 'DELETE /v1/x/:id/y'];

  it('방법과 경로가 모두 맞아야 한다', () => {
    expect(isAllowlisted(list, 'post', '/v1/posts')).toBe(true);
    expect(isAllowlisted(list, 'put', '/v1/posts')).toBe(false);
    expect(isAllowlisted(list, 'post', '/v1/posts/1')).toBe(false);
  });

  it(':이름 은 한 마디와만 맞는다', () => {
    expect(isAllowlisted(list, 'delete', '/v1/x/abc/y')).toBe(true);
    expect(isAllowlisted(list, 'delete', '/v1/x/a/b/y')).toBe(false);
  });

  it('정규식 글자를 그대로 비교한다', () => {
    expect(isAllowlisted(['POST /v1/a.b'], 'post', '/v1/aXb')).toBe(false);
  });

  it('OIDC back-channel 로그아웃은 목록에 있다 — POST 로, 그 경로 하나만', () => {
    const path = '/v1/auth/oidc/backchannel-logout';
    expect(isAllowlisted(PUBLIC_WRITE_ALLOWLIST, 'post', path)).toBe(true);
    expect(isAllowlisted(PUBLIC_WRITE_ALLOWLIST, 'put', path)).toBe(false);
    expect(isAllowlisted(PUBLIC_WRITE_ALLOWLIST, 'post', `${path}/x`)).toBe(
      false,
    );
    // start · callback 은 GET 이라 이 목록과 무관하다 — 쓰기로 열리지 않는다
    expect(
      isAllowlisted(PUBLIC_WRITE_ALLOWLIST, 'post', '/v1/auth/oidc/callback'),
    ).toBe(false);
  });
});
