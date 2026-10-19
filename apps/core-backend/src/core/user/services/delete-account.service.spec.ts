import { PrismaService } from '@weaver2/prisma';
import { PermissionService } from '../../permission/services/permission.service';
import { DeleteAccountService } from './delete-account.service';
import { UserWithdrawalHook } from '../user-withdrawal-hooks';

jest.mock('../repositories/soft-delete-user.command', () => ({
  SoftDeleteUserCommand: jest.fn(),
}));

import { SoftDeleteUserCommand } from '../repositories/soft-delete-user.command';

describe('DeleteAccountService — 탈퇴 정리 자리', () => {
  const tx = {
    $queryRaw: jest.fn(),
    refreshToken: { deleteMany: jest.fn() },
    oAuthAccount: { deleteMany: jest.fn() },
    localCredential: { deleteMany: jest.fn() },
  };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1' }) },
  } as unknown as PrismaService;
  const permissionService = {
    withSuperAdminGuard: jest.fn((fn: (t: typeof tx) => Promise<void>) =>
      fn(tx),
    ),
  } as unknown as PermissionService;

  beforeEach(() => jest.clearAllMocks());

  it('자리가 비어 있으면 탈퇴만 한다', async () => {
    const service = new DeleteAccountService(prisma, permissionService);

    await service.execute('u1');

    expect(SoftDeleteUserCommand).toHaveBeenCalledWith(tx, 'u1');
  });

  it('users 를 먼저 잠그고 refresh 행을 지운다 — 회전 · back-channel 로그아웃과 같은 순서라 교착이 없다', async () => {
    const service = new DeleteAccountService(prisma, permissionService);

    await service.execute('u1');

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.refreshToken.deleteMany.mock.invocationCallOrder[0],
    );
  });

  it('탈퇴 표시 뒤 같은 트랜잭션으로 정리 함수를 차례로 부른다', async () => {
    const order: string[] = [];
    (SoftDeleteUserCommand as jest.Mock).mockImplementation(() => {
      order.push('soft-delete');
    });
    const first: UserWithdrawalHook = jest.fn(() => {
      order.push('first');
      return Promise.resolve();
    });
    const second: UserWithdrawalHook = jest.fn(() => {
      order.push('second');
      return Promise.resolve();
    });
    const service = new DeleteAccountService(prisma, permissionService, [
      first,
      second,
    ]);

    await service.execute('u1');

    expect(order).toEqual(['soft-delete', 'first', 'second']);
    expect(first).toHaveBeenCalledWith(tx, 'u1');
  });

  it('정리 함수가 던지면 탈퇴도 실패한다 — 트랜잭션이 되돌린다', async () => {
    const service = new DeleteAccountService(prisma, permissionService, [
      () => Promise.reject(new Error('boom')),
    ]);

    await expect(service.execute('u1')).rejects.toThrow('boom');
  });
});
