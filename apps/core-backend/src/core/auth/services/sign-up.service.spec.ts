import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@weaver2/prisma';
import { SignUpService } from './sign-up.service';
import { FindUserService } from '../../user/services/find-user.service';
import { EmailBusinessService } from '../../../infrastructure/email/services/email-business.service';
import { TermsService } from '../../terms/services/terms.service';
import { OneTimeCodeService } from '../one-time-code/one-time-code.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('../repositories/find-user-by-email.query', () => ({
  FindUserByEmailQuery: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';

describe('SignUpService', () => {
  const mockCompare = bcrypt.compare as jest.Mock;
  const mockFindByEmail = FindUserByEmailQuery as jest.Mock;
  const tx = { user: { update: jest.fn() } };
  let prisma: {
    user: { findUnique: jest.Mock };
    $transaction: (fn: (t: typeof tx) => Promise<unknown>) => Promise<unknown>;
  };
  let email: { sendWelcomeEmail: jest.Mock; sendVerificationEmail: jest.Mock };
  let oneTimeCode: {
    findLinkOwner: jest.Mock;
    consumeLink: jest.Mock;
    issueLink: jest.Mock;
    deliverOrRevoke: jest.Mock;
  };
  let service: SignUpService;

  const owner = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-1',
    email: 'a@b.c',
    displayName: 'A',
    deletedAt: null,
    emailVerifiedAt: null,
    localCredential: { password: 'hashed:owner-pw' },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(owner()) },
      $transaction: (fn) => fn(tx),
    };
    email = { sendWelcomeEmail: jest.fn(), sendVerificationEmail: jest.fn() };
    oneTimeCode = {
      findLinkOwner: jest.fn().mockResolvedValue('user-1'),
      consumeLink: jest.fn().mockResolvedValue('user-1'),
      issueLink: jest.fn(),
      deliverOrRevoke: jest.fn(
        (_u: string, _p: string, send: () => Promise<unknown>) => send(),
      ),
    };
    service = new SignUpService(
      prisma as unknown as PrismaService,
      {} as JwtService,
      { get: () => 'https://app.example' } as unknown as ConfigService,
      {} as FindUserService,
      email as unknown as EmailBusinessService,
      {} as TermsService,
      oneTimeCode as unknown as OneTimeCodeService,
    );
  });

  describe('verifyEmail', () => {
    it('링크와 가입 때 비밀번호가 맞으면 같은 트랜잭션에서 링크를 소비하고 인증 시각을 남긴다', async () => {
      mockCompare.mockResolvedValue(true);

      await service.verifyEmail('tok', 'owner-pw');

      expect(mockCompare).toHaveBeenCalledWith('owner-pw', 'hashed:owner-pw');
      expect(oneTimeCode.consumeLink).toHaveBeenCalledWith(
        'tok',
        'EMAIL_VERIFICATION',
        tx,
      );
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { emailVerifiedAt: expect.any(Date) as Date },
      });
      expect(email.sendWelcomeEmail).toHaveBeenCalledWith(
        'a@b.c',
        'A',
        'user-1',
      );
    });

    it('비밀번호가 틀리면 인증하지 않고 링크도 남긴다 (선점 가입 탈취 방지)', async () => {
      mockCompare.mockResolvedValue(false);

      await expect(service.verifyEmail('tok', 'guess')).rejects.toThrow(
        'VERIFY_PASSWORD_MISMATCH',
      );
      expect(oneTimeCode.consumeLink).not.toHaveBeenCalled();
      expect(email.sendWelcomeEmail).not.toHaveBeenCalled();
    });

    it('살아 있는 링크가 없으면(없음·만료) 비밀번호를 보기 전에 거절한다', async () => {
      oneTimeCode.findLinkOwner.mockResolvedValue(null);

      await expect(
        service.verifyEmail('nope', 'owner-pw'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockCompare).not.toHaveBeenCalled();
    });

    it('탈퇴한 계정은 거절한다', async () => {
      prisma.user.findUnique.mockResolvedValue(
        owner({ deletedAt: new Date() }),
      );

      await expect(
        service.verifyEmail('tok', 'owner-pw'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockCompare).not.toHaveBeenCalled();
    });

    it('비밀번호 확인 사이에 링크가 소비됐으면(동시 요청) 인증하지 않는다', async () => {
      mockCompare.mockResolvedValue(true);
      oneTimeCode.consumeLink.mockResolvedValue(null);

      await expect(
        service.verifyEmail('tok', 'owner-pw'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.user.update).not.toHaveBeenCalled();
      expect(email.sendWelcomeEmail).not.toHaveBeenCalled();
    });
  });

  describe('resendVerificationEmail', () => {
    const SAME_MESSAGE = {
      message:
        'If the email address exists and is unverified, a new verification email has been sent.',
    };

    it('미인증 계정이면 링크를 발급해 저장된 주소로 보낸다', async () => {
      mockFindByEmail.mockResolvedValue(owner());
      oneTimeCode.issueLink.mockResolvedValue('tok');

      await expect(service.resendVerificationEmail('A@b.c')).resolves.toEqual(
        SAME_MESSAGE,
      );
      expect(email.sendVerificationEmail).toHaveBeenCalledWith(
        'a@b.c',
        'https://app.example/auth/verify?token=tok',
        'user-1',
      );
    });

    it('이미 인증했거나 없는 계정이면 발급하지 않고 같은 응답 (열거 방지)', async () => {
      mockFindByEmail.mockResolvedValueOnce(
        owner({ emailVerifiedAt: new Date() }),
      );
      await expect(service.resendVerificationEmail('a@b.c')).resolves.toEqual(
        SAME_MESSAGE,
      );
      mockFindByEmail.mockResolvedValueOnce(null);
      await expect(service.resendVerificationEmail('x@b.c')).resolves.toEqual(
        SAME_MESSAGE,
      );
      expect(oneTimeCode.issueLink).not.toHaveBeenCalled();
    });

    it('유예 중이면(발급 null) 보내지 않고 같은 응답', async () => {
      mockFindByEmail.mockResolvedValue(owner());
      oneTimeCode.issueLink.mockResolvedValue(null);

      await expect(service.resendVerificationEmail('a@b.c')).resolves.toEqual(
        SAME_MESSAGE,
      );
      expect(email.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
