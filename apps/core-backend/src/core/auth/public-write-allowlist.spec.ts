import { isAllowlisted } from './public-write-allowlist';

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
});
