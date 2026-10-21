import { loggableUrl } from './request-logger.middleware';

describe('loggableUrl', () => {
  it.each([
    ['/v1/auth/oidc/callback?code=c&state=s&iss=i', '/v1/auth/oidc/callback'],
    [
      '/v1/auth/oauth/google/callback?code=c&state=s',
      '/v1/auth/oauth/google/callback',
    ],
    ['/api/v1/auth/oidc/callback/?code=c', '/api/v1/auth/oidc/callback/'],
  ])('콜백의 쿼리(code · state)는 남기지 않는다: %s', (url, logged) => {
    expect(loggableUrl(url)).toBe(logged);
  });

  it('그 밖의 경로는 그대로', () => {
    expect(loggableUrl('/v1/posts?page=2')).toBe('/v1/posts?page=2');
    expect(loggableUrl('/v1/auth/oidc/start?entry=admin')).toBe(
      '/v1/auth/oidc/start?entry=admin',
    );
  });
});
