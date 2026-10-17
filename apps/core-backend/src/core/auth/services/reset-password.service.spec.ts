import { BadRequestException } from '@nestjs/common';
import { ResetPasswordService } from './reset-password.service';
import { PrismaService } from '@weaver2/prisma';
import { OneTimeCodeService } from '../one-time-code/one-time-code.service';

jest.mock('../repositories/reserve-auth-attempt.command', () => ({
  ...jest.requireActual<
    typeof import('../repositories/reserve-auth-attempt.command')
  >('../repositories/reserve-auth-attempt.command'),
  ReserveAuthAttemptCommand: jest.fn().mockResolvedValue(true),
}));
jest.mock('../repositories/reset-auth-attempts.command', () => ({
  ResetAuthAttemptsCommand: jest.fn(),
}));
jest.mock('bcrypt', () => ({
  hash: jest.fn((pw: string) => Promise.resolve(`hashed:${pw}`)),
}));

jest.mock('../repositories/update-local-credential-password.command', () => ({
  UpdateLocalCredentialPasswordCommand: jest.fn(),
}));

jest.mock('../repositories/delete-refresh-tokens-by-user-id.command', () => ({
  DeleteRefreshTokensByUserIdCommand: jest.fn(),
}));

import { UpdateLocalCredentialPasswordCommand } from '../repositories/update-local-credential-password.command';
import { DeleteRefreshTokensByUserIdCommand } from '../repositories/delete-refresh-tokens-by-user-id.command';

describe('ResetPasswordService', () => {
  let service: ResetPasswordService;
  const mockUpdate = UpdateLocalCredentialPasswordCommand as jest.Mock;
  const mockRevokeSessions = DeleteRefreshTokensByUserIdCommand as jest.Mock;
  const tx = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    userSetting: { updateMany: jest.fn() },
    oneTimeCode: { deleteMany: jest.fn() },
  };
  const prisma = {
    $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService;
  const oneTimeCode = { consumeLink: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ResetPasswordService(
      prisma,
      oneTimeCode as unknown as OneTimeCodeService,
    );
  });

  function linkOwnedBy(user: {
    deletedAt?: Date | null;
    emailVerifiedAt: Date | null;
  }) {
    oneTimeCode.consumeLink.mockResolvedValue('user-1');
    tx.user.findUnique.mockResolvedValue({ deletedAt: null, ...user });
  }

  it('링크를 같은 트랜잭션에서 소비하고, 비밀번호를 바꾸고, 세션을 전부 무효화한다', async () => {
    linkOwnedBy({ emailVerifiedAt: new Date() });

    await service.execute({ token: 'tok', password: 'NewPass123!' });

    expect(oneTimeCode.consumeLink).toHaveBeenCalledWith(
      'tok',
      'PASSWORD_RESET',
      tx,
    );
    expect(mockUpdate).toHaveBeenCalledWith(tx, 'user-1', 'hashed:NewPass123!');
    // 재설정 시 기존 세션을 전부 무효화한다(탈취 계정 복구 대비).
    expect(mockRevokeSessions).toHaveBeenCalledWith(tx, 'user-1');
  });

  it('인증된 계정의 재설정은 인증 시각·설정을 건드리지 않는다', async () => {
    linkOwnedBy({ emailVerifiedAt: new Date() });

    await service.execute({ token: 'tok', password: 'NewPass123!' });

    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.userSetting.updateMany).not.toHaveBeenCalled();
  });

  it('미인증 계정은 인증을 끝내고, 마케팅 동의와 남은 인증 링크를 버린다 (선점 가입 복구)', async () => {
    linkOwnedBy({ emailVerifiedAt: null });

    await service.execute({ token: 'tok', password: 'NewPass123!' });

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { emailVerifiedAt: expect.any(Date) as Date },
    });
    expect(tx.userSetting.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { isMarketingConsentGiven: false },
    });
    expect(tx.oneTimeCode.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', purpose: 'EMAIL_VERIFICATION' },
    });
  });

  it('살아 있는 링크가 없으면(만료·없음·사용됨) BadRequestException', async () => {
    oneTimeCode.consumeLink.mockResolvedValue(null);

    await expect(
      service.execute({ token: 'invalid', password: 'pw' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('탈퇴한 계정이면 BadRequestException — 트랜잭션이 되돌려 링크도 남는다', async () => {
    linkOwnedBy({ deletedAt: new Date(), emailVerifiedAt: new Date() });

    await expect(
      service.execute({ token: 'tok', password: 'pw' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
