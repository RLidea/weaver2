import { ConflictException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { EmailChangeService } from './email-change.service';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
}));
jest.mock('../repositories/find-email-change-request.query', () => ({
  FindEmailChangeRequestQuery: jest.fn(),
}));
jest.mock('../repositories/update-user-email.command', () => ({
  UpdateUserEmailCommand: jest.fn(),
}));
jest.mock('../repositories/delete-email-change-requests.command', () => ({
  DeleteEmailChangeRequestsCommand: jest.fn(),
}));

import { FindEmailChangeRequestQuery } from '../repositories/find-email-change-request.query';
import { UpdateUserEmailCommand } from '../repositories/update-user-email.command';
import { DeleteEmailChangeRequestsCommand } from '../repositories/delete-email-change-requests.command';

describe('EmailChangeService.confirmEmailChange', () => {
  const mockFind = FindEmailChangeRequestQuery as jest.Mock;
  const mockUpdate = UpdateUserEmailCommand as jest.Mock;
  const mockDelete = DeleteEmailChangeRequestsCommand as jest.Mock;
  let service: EmailChangeService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFind.mockResolvedValue({ newEmail: 'new@x.com', codeHash: 'h' });
    service = new EmailChangeService(
      {} as PrismaService,
      {} as EmailBusinessService,
    );
  });

  it('요청 뒤 그 주소로 다른 계정이 생겼으면 500 이 아니라 409', async () => {
    mockUpdate.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.confirmEmailChange('user-1', '123456'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('그 밖의 오류는 그대로 던진다', async () => {
    const boom = new Error('db down');
    mockUpdate.mockRejectedValue(boom);

    await expect(service.confirmEmailChange('user-1', '123456')).rejects.toBe(
      boom,
    );
  });

  it('성공하면 요청을 지운다', async () => {
    mockUpdate.mockResolvedValue({});

    await service.confirmEmailChange('user-1', '123456');

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
