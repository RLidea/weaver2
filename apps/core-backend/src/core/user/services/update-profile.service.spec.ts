import { BadRequestException, ConflictException } from '@nestjs/common';
import { UpdateProfileService } from './update-profile.service';
import { PrismaService } from '@weaver2/prisma';

jest.mock('../repositories/find-user-by-display-name.query', () => ({
  FindUserByDisplayNameQuery: jest.fn(),
}));

jest.mock('../repositories/find-user-by-username.query', () => ({
  FindUserByUsernameQuery: jest.fn(),
}));

jest.mock('../repositories/update-user.command', () => ({
  UpdateUserCommand: jest.fn(),
}));

jest.mock('../repositories/upsert-user-setting.command', () => ({
  UpsertUserSettingCommand: jest.fn(),
}));

import { FindUserByDisplayNameQuery } from '../repositories/find-user-by-display-name.query';
import { FindUserByUsernameQuery } from '../repositories/find-user-by-username.query';
import { UpdateUserCommand } from '../repositories/update-user.command';

describe('UpdateProfileService', () => {
  let service: UpdateProfileService;
  const findUnique = jest.fn();
  const prisma = { user: { findUnique } } as unknown as PrismaService;
  const mockFindByDisplayName = FindUserByDisplayNameQuery as jest.Mock;
  const mockFindByUsername = FindUserByUsernameQuery as jest.Mock;
  const mockUpdateUser = UpdateUserCommand as jest.Mock;

  /** 예약어인 이름을 이미 쓰고 있는 계정 (시드의 최고관리자가 이 상태다). */
  const reservedHolder = { displayName: '관리자', username: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue(reservedHolder);
    mockFindByDisplayName.mockResolvedValue(null);
    mockFindByUsername.mockResolvedValue(null);
    service = new UpdateProfileService(prisma);
  });

  // 예약어 검사는 **새로 차지하는 것**을 막는 장치다. 아래 두 방향을 함께 못박는다 —
  // "유지 → 통과" 만 확인하면 게이트가 통째로 열려도 이 스펙은 초록으로 남는다.
  describe('예약어 검사는 값이 바뀔 때만 한다', () => {
    it('예약어인 자기 이름을 그대로 보내면 통과한다', async () => {
      await expect(
        service.updateProfile('user-1', {
          displayName: '관리자',
          username: 'admin',
          darkMode: true,
        }),
      ).resolves.toBeUndefined();

      expect(mockUpdateUser).toHaveBeenCalledWith(prisma, 'user-1', {
        displayName: '관리자',
        username: 'admin',
      });
    });

    it('닉네임을 예약어로 바꾸려 하면 400 이다', async () => {
      findUnique.mockResolvedValue({
        displayName: '평범한이름',
        username: 'normal',
      });

      await expect(
        service.updateProfile('user-1', { displayName: '운영자' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('사용자 이름을 예약어로 바꾸려 하면 400 이다', async () => {
      findUnique.mockResolvedValue({
        displayName: '평범한이름',
        username: 'normal',
      });

      await expect(
        service.updateProfile('user-1', { username: 'moderator' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });
  });

  describe('중복 검사는 그대로다', () => {
    it('남이 쓰는 닉네임으로 바꾸려 하면 409 다', async () => {
      findUnique.mockResolvedValue({
        displayName: '평범한이름',
        username: 'normal',
      });
      mockFindByDisplayName.mockResolvedValue({ id: 'user-2' });

      await expect(
        service.updateProfile('user-1', { displayName: '다른이름' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
