import { safeRedirectPath } from './redirect-path';

describe('safeRedirectPath', () => {
  it('같은 출처의 경로는 그대로, 없으면 기본값', () => {
    expect(safeRedirectPath('/admin/users?tab=a#x')).toBe('/admin/users?tab=a#x');
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath('', '/home')).toBe('/home');
  });

  it.each([
    '//evil.com',
    'https://evil.com',
    '/\t/evil.com',
    '\\\\evil.com',
    '/\\evil.com',
    // 출처는 같지만 점 마디를 풀면 //evil.com (보안 검토 H1)
    '/.//evil.com',
    '/..//evil.com',
    '/%2e//evil.com',
    '/a/..//evil.com',
    '/x/../\\evil.com',
    '/./\\evil.com',
  ])('%j → 기본값', (value) => {
    expect(safeRedirectPath(value)).toBe('/dashboard');
  });
});
