import { PrismaClient } from '@weaver2/prisma';
import { SoftDeleteUserCommand } from './soft-delete-user.command';

describe('SoftDeleteUserCommand', () => {
  it('탈퇴 표시와 함께 바깥 신원(ssoSubject)을 비운다', async () => {
    const prisma = {
      oneTimeCode: { deleteMany: jest.fn() },
      twoFactorMethod: { deleteMany: jest.fn() },
      authLockout: { deleteMany: jest.fn() },
      user: { update: jest.fn().mockResolvedValue({}) },
    };

    await SoftDeleteUserCommand(prisma as unknown as PrismaClient, 'u1');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { deletedAt: expect.any(Date) as Date, ssoSubject: null },
    });
    expect(prisma.twoFactorMethod.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
  });
});
