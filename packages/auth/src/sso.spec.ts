import { ssoErrorMessage, ssoStartUrl } from './sso';

describe('ssoStartUrl', () => {
  it('API 기준 주소 아래 start 로, entry · next · lang 을 싣는다', () => {
    expect(
      ssoStartUrl({ next: '/admin?tab=a', lang: 'ja', apiBase: '/api/' }),
    ).toBe('/api/v1/auth/oidc/start?entry=admin&next=%2Fadmin%3Ftab%3Da&lang=ja');
  });

  it('next · lang 이 없으면 싣지 않는다', () => {
    expect(ssoStartUrl({ entry: 'site', apiBase: 'https://api.example.com' })).toBe(
      'https://api.example.com/v1/auth/oidc/start?entry=site',
    );
  });
});

describe('ssoErrorMessage', () => {
  it.each([
    'sso_failed',
    'sso_cancelled',
    'sso_unavailable',
    'sso_email_unverified',
    'sso_conflict',
    'account_suspended',
    'account_deleted',
  ])('%s 에 문구가 있다', (code) => {
    expect(ssoErrorMessage(code)).toEqual(expect.any(String));
  });

  it('모르는 값 · 없음 → null', () => {
    expect(ssoErrorMessage('oauth_failed')).toBeNull();
    expect(ssoErrorMessage(null)).toBeNull();
  });
});
