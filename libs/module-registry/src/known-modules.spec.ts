import { resolveModuleId, KNOWN_MODULES } from './known-modules';

describe('resolveModuleId', () => {
  it('maps core/auth relative import to "auth"', () => {
    expect(resolveModuleId('../../../core/auth/guards/jwt-auth.guard')).toBe('auth');
  });

  it('maps core/permission import to "permission"', () => {
    expect(
      resolveModuleId('../../../core/permission/decorators/require-permission.decorator'),
    ).toBe('permission');
  });

  it('maps core/notification import to "notification"', () => {
    expect(resolveModuleId('../../../core/notification/dto/notification-event.dto')).toBe(
      'notification',
    );
  });

  it('maps core/user and core/terms imports', () => {
    expect(resolveModuleId('../../../core/user/services/user.service')).toBe('user');
    expect(resolveModuleId('../../../core/terms/services/terms.service')).toBe('terms');
  });

  it('maps @weaver2/upload and @weaver2/email package imports', () => {
    expect(resolveModuleId('@weaver2/upload')).toBe('upload');
    expect(resolveModuleId('@weaver2/email')).toBe('email');
  });

  it('returns null for common infra / framework imports', () => {
    expect(resolveModuleId('@weaver2/common')).toBeNull();
    expect(resolveModuleId('@weaver2/prisma')).toBeNull();
    expect(resolveModuleId('@weaver2/pagination')).toBeNull();
    expect(resolveModuleId('@weaver2/shared')).toBeNull();
    expect(resolveModuleId('@nestjs/common')).toBeNull();
    expect(resolveModuleId('./services/post.service')).toBeNull();
  });

  it('exposes the allowlist as KNOWN_MODULES', () => {
    expect(KNOWN_MODULES.map((m) => m.id).sort()).toEqual(
      ['auth', 'email', 'notification', 'permission', 'terms', 'upload', 'user'].sort(),
    );
  });
});
