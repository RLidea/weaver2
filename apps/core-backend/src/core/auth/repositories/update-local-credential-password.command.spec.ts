import { PrismaClient } from '@weaver2/prisma';
import { UpdateLocalCredentialPasswordCommand } from './update-local-credential-password.command';

describe('UpdateLocalCredentialPasswordCommand', () => {
  let update: jest.Mock;
  let deleteMany: jest.Mock;
  let prisma: PrismaClient;

  beforeEach(() => {
    update = jest.fn();
    deleteMany = jest.fn();
    prisma = {
      localCredential: { update },
      oneTimeCode: { deleteMany },
    } as unknown as PrismaClient;
  });

  it('비밀번호와 바꾼 시각만 바꾸고 인증 상태는 건드리지 않는다', async () => {
    await UpdateLocalCredentialPasswordCommand(prisma, 'user-1', 'hashed');

    expect(update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: {
        passwordHash: 'hashed',
        passwordChangedAt: expect.any(Date) as Date,
      },
    });
  });

  it('살아 있던 재설정 링크를 버린다', async () => {
    await UpdateLocalCredentialPasswordCommand(prisma, 'user-1', 'hashed');

    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', purpose: 'PASSWORD_RESET' },
    });
  });
});
