import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { ChangePasswordService } from './change-password.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed:new'),
}));
jest.mock(
  '../../auth/repositories/find-local-credential-by-user-id.query',
  () => ({
    FindLocalCredentialByUserIdQuery: jest
      .fn()
      .mockResolvedValue({ passwordHash: 'hash' }),
  }),
);
jest.mock(
  '../../auth/repositories/update-local-credential-password.command',
  () => ({
    UpdateLocalCredentialPasswordCommand: jest.fn(),
  }),
);
jest.mock(
  '../../auth/repositories/delete-refresh-tokens-by-user-id.command',
  () => ({
    DeleteRefreshTokensByUserIdCommand: jest.fn(),
  }),
);
jest.mock('../../auth/repositories/reserve-auth-attempt.command', () => ({
  ...jest.requireActual<
    typeof import('../../auth/repositories/reserve-auth-attempt.command')
  >('../../auth/repositories/reserve-auth-attempt.command'),
  ReserveAuthAttemptCommand: jest.fn(),
}));
jest.mock('../../auth/repositories/reset-auth-attempts.command', () => ({
  ResetAuthAttemptsCommand: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { UpdateLocalCredentialPasswordCommand } from '../../auth/repositories/update-local-credential-password.command';
import { ReserveAuthAttemptCommand } from '../../auth/repositories/reserve-auth-attempt.command';
import { ResetAuthAttemptsCommand } from '../../auth/repositories/reset-auth-attempts.command';

describe('ChangePasswordService — 현재 비밀번호 대입도 PASSWORD 잠금에 센다', () => {
  const mockCompare = bcrypt.compare as jest.Mock;
  const mockReserve = ReserveAuthAttemptCommand as jest.Mock;
  const mockReset = ResetAuthAttemptsCommand as jest.Mock;
  const mockUpdate = UpdateLocalCredentialPasswordCommand as jest.Mock;
  const prisma = {} as PrismaService;
  let service: ChangePasswordService;
  const dto = { currentPassword: 'old', newPassword: 'NewPass1234!' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockReserve.mockResolvedValue(true);
    service = new ChangePasswordService(prisma);
  });

  it('맞으면 비밀번호를 바꾸고 PASSWORD 시도를 되돌린다', async () => {
    mockCompare.mockResolvedValue(true);

    await service.changePassword('user-1', dto);

    expect(mockReserve).toHaveBeenCalledWith(prisma, 'user-1', 'PASSWORD');
    expect(mockUpdate).toHaveBeenCalledWith(prisma, 'user-1', 'hashed:new');
    expect(mockReset).toHaveBeenCalledWith(prisma, 'user-1', 'PASSWORD');
  });

  it('틀리면 시도를 남기고 바꾸지 않는다', async () => {
    mockCompare.mockResolvedValue(false);

    await expect(service.changePassword('user-1', dto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(mockReset).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('잠겼으면 비밀번호를 보지도 않는다', async () => {
    mockReserve.mockResolvedValue(false);

    await expect(service.changePassword('user-1', dto)).rejects.toThrow(
      /locked/,
    );
    expect(mockCompare).not.toHaveBeenCalled();
  });
});
