import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PermissionService } from '../services/permission.service';

describe('PermissionGuard', () => {
  const hasAnyPermission = jest.fn();
  const reflector = { getAllAndOverride: jest.fn(), get: jest.fn() };
  const guard = new PermissionGuard(
    reflector as unknown as Reflector,
    { hasAnyPermission } as unknown as PermissionService,
  );

  const contextFor = (request: object) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    hasAnyPermission.mockReset();
    reflector.getAllAndOverride.mockReset();
    reflector.get.mockReset();
  });

  it('권한 데코레이터가 없으면 통과한다 — 토큰 주체도', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(
      guard.canActivate(
        contextFor({ user: { id: 'u' }, apiToken: { id: 't', scopes: [] } }),
      ),
    ).resolves.toBe(true);
  });

  it('토큰 주체는 핸들러에 범위가 있으면 권한을 묻지 않고 통과 — 범위가 권한을 대신한다', async () => {
    reflector.getAllAndOverride.mockReturnValue(['admin:access']);
    reflector.get.mockReturnValue('blog:draft');
    await expect(
      guard.canActivate(
        contextFor({
          user: { id: 'u' },
          apiToken: { id: 't', scopes: ['blog:draft'] },
        }),
      ),
    ).resolves.toBe(true);
    expect(hasAnyPermission).not.toHaveBeenCalled();
  });

  it('🔴 범위가 없는 핸들러면 토큰 주체는 권한을 묻지도 않고 403 — 주인이 최고관리자여도', async () => {
    reflector.getAllAndOverride.mockReturnValue(['admin:access']);
    reflector.get.mockReturnValue(undefined);
    hasAnyPermission.mockResolvedValue(true);
    await expect(
      guard.canActivate(
        contextFor({ user: { id: 'u' }, apiToken: { id: 't', scopes: ['x'] } }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(hasAnyPermission).not.toHaveBeenCalled();
  });

  it('세션 사용자는 지금처럼 권한으로 판정한다', async () => {
    reflector.getAllAndOverride.mockReturnValue(['admin:access']);
    hasAnyPermission.mockResolvedValue(true);
    await expect(
      guard.canActivate(contextFor({ user: { id: 'u' } })),
    ).resolves.toBe(true);
    hasAnyPermission.mockResolvedValue(false);
    await expect(
      guard.canActivate(contextFor({ user: { id: 'u' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
