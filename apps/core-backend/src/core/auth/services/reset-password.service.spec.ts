import { BadRequestException } from '@nestjs/common';
import { ResetPasswordService } from './reset-password.service';
import { PrismaService } from '@weaver2/prisma';

jest.mock('bcrypt', () => ({
  hash: jest.fn((pw: string) => Promise.resolve(`hashed:${pw}`)),
}));

jest.mock('../repositories/find-local-credential-by-reset-token.query', () => ({
  FindLocalCredentialByResetTokenQuery: jest.fn(),
}));

jest.mock('../repositories/update-local-credential-password.command', () => ({
  UpdateLocalCredentialPasswordCommand: jest.fn(),
}));

jest.mock('../repositories/delete-refresh-tokens-by-user-id.command', () => ({
  DeleteRefreshTokensByUserIdCommand: jest.fn(),
}));

import { FindLocalCredentialByResetTokenQuery } from '../repositories/find-local-credential-by-reset-token.query';
import { UpdateLocalCredentialPasswordCommand } from '../repositories/update-local-credential-password.command';
import { DeleteRefreshTokensByUserIdCommand } from '../repositories/delete-refresh-tokens-by-user-id.command';

describe('ResetPasswordService', () => {
  let service: ResetPasswordService;
  const updateSettings = jest.fn();
  const prisma = {
    userSetting: { updateMany: updateSettings },
  } as unknown as PrismaService;
  const mockFind = FindLocalCredentialByResetTokenQuery as jest.Mock;
  const mockUpdate = UpdateLocalCredentialPasswordCommand as jest.Mock;
  const mockRevokeSessions = DeleteRefreshTokensByUserIdCommand as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ResetPasswordService(prisma);
  });

  it('유효한 토큰 → 비밀번호 해싱 후 update(인증까지) + 전체 세션 무효화', async () => {
    mockFind.mockResolvedValue({ userId: 'user-1', isVerified: true });

    await service.execute({ token: 'tok', password: 'NewPass123!' });

    expect(mockFind).toHaveBeenCalledWith(prisma, 'tok');
    // 메일함 소유를 증명했으니 미인증 계정도 인증을 끝낸다(선점 가입을 당한 주인의 복구 경로).
    expect(mockUpdate).toHaveBeenCalledWith(
      prisma,
      'user-1',
      'hashed:NewPass123!',
      { markVerified: true },
    );
    // 재설정 시 기존 세션을 전부 무효화한다(탈취 계정 복구 대비).
    expect(mockRevokeSessions).toHaveBeenCalledWith(prisma, 'user-1');
  });

  it('인증된 계정의 재설정은 설정을 건드리지 않는다', async () => {
    mockFind.mockResolvedValue({ userId: 'user-1', isVerified: true });

    await service.execute({ token: 'tok', password: 'NewPass123!' });

    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('미인증 계정을 재설정이 인증하면 마케팅 수신 동의를 되돌린다 (선점 가입 복구)', async () => {
    mockFind.mockResolvedValue({ userId: 'user-1', isVerified: false });

    await service.execute({ token: 'tok', password: 'NewPass123!' });

    expect(updateSettings).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { isMarketingConsentGiven: false },
    });
    expect(mockRevokeSessions).toHaveBeenCalledWith(prisma, 'user-1');
  });

  it('credential 없으면(만료/없음/사용됨) BadRequestException', async () => {
    mockFind.mockResolvedValue(null);

    await expect(
      service.execute({ token: 'invalid', password: 'pw' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
