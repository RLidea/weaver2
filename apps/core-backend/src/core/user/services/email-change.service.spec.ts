import {
  BadRequestException,
  ConflictException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { EmailChangeService } from './email-change.service';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { OneTimeCodeService } from '../../auth/one-time-code/one-time-code.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
}));
jest.mock(
  '../../auth/repositories/find-local-credential-by-user-id.query',
  () => ({
    FindLocalCredentialByUserIdQuery: jest
      .fn()
      .mockResolvedValue({ password: 'hash' }),
  }),
);
jest.mock('../repositories/update-user-email.command', () => ({
  UpdateUserEmailCommand: jest.fn(),
}));

import { UpdateUserEmailCommand } from '../repositories/update-user-email.command';

describe('EmailChangeService', () => {
  const mockUpdate = UpdateUserEmailCommand as jest.Mock;
  let oneTimeCode: {
    issueCode: jest.Mock;
    verifyCode: jest.Mock;
    deliverOrRevoke: jest.Mock;
  };
  let email: { sendEmailChangeVerificationEmail: jest.Mock };
  let prisma: { user: { findUnique: jest.Mock } };
  let service: EmailChangeService;

  beforeEach(() => {
    jest.clearAllMocks();
    oneTimeCode = {
      issueCode: jest.fn(),
      verifyCode: jest.fn(),
      deliverOrRevoke: jest.fn(
        (_u: string, _p: string, send: () => Promise<unknown>) => send(),
      ),
    };
    email = { sendEmailChangeVerificationEmail: jest.fn() };
    prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    service = new EmailChangeService(
      prisma as unknown as PrismaService,
      email as unknown as EmailBusinessService,
      oneTimeCode as unknown as OneTimeCodeService,
    );
  });

  describe('requestEmailChange', () => {
    it('새 주소를 소문자로 코드와 함께 저장하고, 그 주소로 코드를 보낸다', async () => {
      oneTimeCode.issueCode.mockResolvedValue('012345');

      await service.requestEmailChange('user-1', 'pw', 'New@X.com');

      expect(oneTimeCode.issueCode).toHaveBeenCalledWith(
        'user-1',
        'EMAIL_CHANGE',
        { newEmail: 'new@x.com' },
      );
      expect(email.sendEmailChangeVerificationEmail).toHaveBeenCalledWith(
        'new@x.com',
        '012345',
        'user-1',
      );
    });

    it('유예 중이면(발급 null) 보내지 않고 429', async () => {
      oneTimeCode.issueCode.mockResolvedValue(null);

      await expect(
        service.requestEmailChange('user-1', 'pw', 'new@x.com'),
      ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
      expect(email.sendEmailChangeVerificationEmail).not.toHaveBeenCalled();
    });

    it('이미 쓰이는 주소면 코드를 발급하지 않고 409', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'other' });

      await expect(
        service.requestEmailChange('user-1', 'pw', 'taken@x.com'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(oneTimeCode.issueCode).not.toHaveBeenCalled();
    });
  });

  describe('confirmEmailChange', () => {
    it('맞는 코드면 코드에 저장된 주소로 바꾼다', async () => {
      oneTimeCode.verifyCode.mockResolvedValue({ newEmail: 'new@x.com' });
      mockUpdate.mockResolvedValue({});

      await service.confirmEmailChange('user-1', '123456');

      expect(oneTimeCode.verifyCode).toHaveBeenCalledWith(
        'user-1',
        'EMAIL_CHANGE',
        '123456',
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        'new@x.com',
      );
    });

    it('틀리거나 만료·소진된 코드는 바꾸지 않고 400', async () => {
      oneTimeCode.verifyCode.mockResolvedValue(null);

      await expect(
        service.confirmEmailChange('user-1', '000000'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('요청 뒤 그 주소로 다른 계정이 생겼으면 500 이 아니라 409', async () => {
      oneTimeCode.verifyCode.mockResolvedValue({ newEmail: 'new@x.com' });
      mockUpdate.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.confirmEmailChange('user-1', '123456'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('그 밖의 오류는 그대로 던진다', async () => {
      oneTimeCode.verifyCode.mockResolvedValue({ newEmail: 'new@x.com' });
      const boom = new Error('db down');
      mockUpdate.mockRejectedValue(boom);

      await expect(service.confirmEmailChange('user-1', '123456')).rejects.toBe(
        boom,
      );
    });
  });
});
