import { PrismaClient } from '@weaver2/prisma';
import { UpdateLocalCredentialPasswordCommand } from './update-local-credential-password.command';

describe('UpdateLocalCredentialPasswordCommand', () => {
  let update: jest.Mock;
  let prisma: PrismaClient;

  beforeEach(() => {
    update = jest.fn();
    prisma = { localCredential: { update } } as unknown as PrismaClient;
  });

  it('기본(비밀번호 변경)은 인증 상태를 건드리지 않는다', async () => {
    await UpdateLocalCredentialPasswordCommand(prisma, 'user-1', 'hashed');

    expect(update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: {
        password: 'hashed',
        passwordResetToken: null,
        resetTokenExpiry: null,
      },
    });
  });

  it('markVerified 면 인증을 끝내고 남은 인증 토큰을 버린다', async () => {
    await UpdateLocalCredentialPasswordCommand(prisma, 'user-1', 'hashed', {
      markVerified: true,
    });

    expect(update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: {
        password: 'hashed',
        passwordResetToken: null,
        resetTokenExpiry: null,
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });
  });
});
